/**
 * Renderizador mínimo para pruebas en Node (sin DOM ni react-test-renderer).
 *
 * Instala un dispatcher de hooks propio en React, recorre el árbol de elementos y
 * produce nodos "host" (los componentes de `test-utils/react-native` son strings).
 * Soporta estado, refs, memo, efectos, contexto y `useSyncExternalStore`, suficiente
 * para Zustand y TanStack Query reales.
 */
import * as React from 'react';
import { afterEach } from 'vitest';

type Props = Record<string, any>;
export type HostNode = { type: string; props: Props; children: Child[]; parent: HostNode | null };
type Child = HostNode | string;

const internals = (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

const FRAGMENT = Symbol.for('react.fragment');
const PASSTHROUGH = new Set([
  FRAGMENT,
  Symbol.for('react.strict_mode'),
  Symbol.for('react.suspense'),
  Symbol.for('react.profiler'),
]);
const CONTEXT = Symbol.for('react.context');
const PROVIDER = Symbol.for('react.provider');
const CONSUMER = Symbol.for('react.consumer');
const MEMO = Symbol.for('react.memo');
const FORWARD_REF = Symbol.for('react.forward_ref');

const depsChanged = (a?: unknown[] | null, b?: unknown[] | null) =>
  !a || !b || a.length !== b.length || a.some((x, i) => !Object.is(x, b[i]));

type Frame = { slots: any[]; i: number };

class Root {
  private instances = new Map<string, any[]>();
  private visited = new Set<string>();
  private effects: (() => void)[] = [];
  private ctx = new Map<unknown, unknown>();
  private current: Frame | null = null;
  private rendering = false;
  private dirty = false;
  batch = 0;
  tree: HostNode = { type: 'root', props: {}, children: [], parent: null };
  private idCounter = 0;

  constructor(private element: React.ReactNode) {}

  schedule = () => {
    if (this.rendering || this.batch > 0) {
      this.dirty = true;
      return;
    }
    this.flush();
  };

  flush() {
    let n = 0;
    do {
      this.dirty = false;
      if (++n > 100) throw new Error('Bucle de renderizado');
      this.renderOnce();
    } while (this.dirty);
  }

  markDirty() {
    this.dirty = true;
  }
  isDirty() {
    return this.dirty;
  }

  unmount() {
    for (const slots of this.instances.values()) this.disposeSlots(slots);
    this.instances.clear();
    this.tree = { type: 'root', props: {}, children: [], parent: null };
  }

  private disposeSlots(slots: any[]) {
    for (const s of slots) {
      if (s?.kind === 'effect') s.cleanup?.();
      if (s?.kind === 'store') s.unsub?.();
    }
  }

  private renderOnce() {
    this.rendering = true;
    this.visited = new Set();
    const prev = internals.H;
    internals.H = this.dispatcher;
    try {
      const root: HostNode = { type: 'root', props: {}, children: [], parent: null };
      root.children = this.renderChild(this.element, 'r', root);
      this.tree = root;
    } finally {
      internals.H = prev;
      this.rendering = false;
    }
    for (const [path, slots] of this.instances) {
      if (!this.visited.has(path)) {
        this.disposeSlots(slots);
        this.instances.delete(path);
      }
    }
    const effects = this.effects;
    this.effects = [];
    this.batch++;
    try {
      for (const e of effects) e();
    } finally {
      this.batch--;
    }
  }

  private renderChild(node: unknown, path: string, parent: HostNode): Child[] {
    if (node == null || typeof node === 'boolean') return [];
    if (typeof node === 'string' || typeof node === 'number') return [String(node)];
    if (Array.isArray(node)) {
      return node.flatMap((n, i) => {
        const key = React.isValidElement(n) && n.key != null ? `k${n.key}` : String(i);
        return this.renderChild(n, `${path}.${key}`, parent);
      });
    }
    if (!React.isValidElement(node)) throw new Error(`Nodo no soportado: ${String(node)}`);
    const el = node as React.ReactElement<Props>;
    return this.renderTyped(el.type, el.props, path, parent);
  }

  private renderTyped(type: any, props: Props, path: string, parent: HostNode): Child[] {
    if (typeof type === 'string') {
      const host: HostNode = { type, props, children: [], parent };
      let children = props.children;
      if (typeof children === 'function') children = children({ pressed: false });
      host.children = this.renderChild(children, `${path}>${type}`, host);
      return [host];
    }
    if (PASSTHROUGH.has(type)) return this.renderChild(props.children, path, parent);
    if (typeof type === 'function') {
      if (type.prototype?.isReactComponent) throw new Error('Componentes de clase no soportados');
      return this.renderComponent(type, props, `${path}/${type.displayName || type.name || 'C'}`, parent);
    }
    if (type && typeof type === 'object') {
      switch (type.$$typeof) {
        case MEMO:
          return this.renderTyped(type.type, props, path, parent);
        case FORWARD_REF:
          return this.renderComponent((p: Props) => type.render(p, p.ref ?? null), props, `${path}/fwd`, parent);
        case CONTEXT:
        case PROVIDER: {
          const context = type.$$typeof === PROVIDER ? type._context : type;
          const had = this.ctx.has(context);
          const prev = this.ctx.get(context);
          this.ctx.set(context, props.value);
          try {
            return this.renderChild(props.children, path, parent);
          } finally {
            if (had) this.ctx.set(context, prev);
            else this.ctx.delete(context);
          }
        }
        case CONSUMER:
          return this.renderChild(props.children(this.readContext(type._context)), path, parent);
      }
    }
    throw new Error(`Tipo de elemento no soportado: ${String(type)}`);
  }

  private renderComponent(fn: (p: Props) => unknown, props: Props, path: string, parent: HostNode) {
    this.visited.add(path);
    let slots = this.instances.get(path);
    if (!slots) {
      slots = [];
      this.instances.set(path, slots);
    }
    const prev = this.current;
    this.current = { slots, i: 0 };
    let out: unknown;
    try {
      out = fn(props);
    } finally {
      this.current = prev;
    }
    return this.renderChild(out, path, parent);
  }

  private readContext(context: any) {
    return this.ctx.has(context) ? this.ctx.get(context) : context._currentValue;
  }

  private slot<T>(init: () => T): T {
    const frame = this.current;
    if (!frame) throw new Error('Hook llamado fuera de un componente');
    const i = frame.i++;
    if (frame.slots.length <= i) frame.slots[i] = init();
    return frame.slots[i];
  }

  private effect(create: () => unknown, deps?: unknown[]) {
    const s = this.slot(() => ({ kind: 'effect', deps: undefined as unknown[] | undefined, cleanup: undefined as any, init: true }));
    if (s.init || depsChanged(s.deps, deps)) {
      s.init = false;
      s.deps = deps;
      this.effects.push(() => {
        s.cleanup?.();
        const c = create();
        s.cleanup = typeof c === 'function' ? c : undefined;
      });
    }
  }

  private dispatcher = {
    readContext: (c: any) => this.readContext(c),
    useContext: (c: any) => this.readContext(c),
    use: (u: any) => {
      if (u && (u.$$typeof === CONTEXT || u.$$typeof === PROVIDER)) return this.readContext(u);
      throw new Error('use(promise) no soportado');
    },
    useState: (init: unknown) =>
      this.dispatcher.useReducer((s: unknown, a: unknown) => (typeof a === 'function' ? a(s) : a), init, (v: unknown) =>
        typeof v === 'function' ? v() : v,
      ),
    useReducer: (reducer: (s: any, a: any) => any, initArg: unknown, init?: (a: unknown) => unknown) => {
      const s = this.slot(() => {
        const st: { value: unknown; dispatch: (a: unknown) => void } = {
          value: init ? init(initArg) : initArg,
          dispatch: (a) => {
            const next = reducer(st.value, a);
            if (!Object.is(next, st.value)) {
              st.value = next;
              this.schedule();
            }
          },
        };
        return st;
      });
      return [s.value, s.dispatch];
    },
    useRef: (init: unknown) => this.slot(() => ({ current: init })),
    useMemo: (fn: () => unknown, deps?: unknown[]) => {
      const s = this.slot(() => ({ deps: undefined as unknown[] | undefined, value: undefined as unknown, init: true }));
      if (s.init || depsChanged(s.deps, deps)) {
        s.init = false;
        s.deps = deps;
        s.value = fn();
      }
      return s.value;
    },
    useCallback: (fn: unknown, deps?: unknown[]) => this.dispatcher.useMemo(() => fn, deps),
    useEffect: (fn: () => unknown, deps?: unknown[]) => this.effect(fn, deps),
    useLayoutEffect: (fn: () => unknown, deps?: unknown[]) => this.effect(fn, deps),
    useInsertionEffect: (fn: () => unknown, deps?: unknown[]) => this.effect(fn, deps),
    useImperativeHandle: (ref: any, create: () => unknown) => {
      if (ref && typeof ref === 'object') ref.current = create();
      else if (typeof ref === 'function') ref(create());
    },
    useDebugValue: () => {},
    useId: () => this.slot(() => `:t${this.idCounter++}:`),
    useTransition: () => [false, (cb: () => void) => cb()],
    useDeferredValue: (v: unknown) => v,
    useEffectEvent: (fn: unknown) => fn,
    useMemoCache: (n: number) => this.slot(() => new Array(n).fill(Symbol.for('react.memo_cache_sentinel'))),
    useSyncExternalStore: (subscribe: (cb: () => void) => () => void, getSnapshot: () => unknown) => {
      const s = this.slot(() => ({
        kind: 'store',
        subscribe: undefined as unknown,
        unsub: undefined as undefined | (() => void),
        get: getSnapshot,
        value: undefined as unknown,
      }));
      s.get = getSnapshot;
      s.value = getSnapshot();
      if (s.subscribe !== subscribe) {
        s.unsub?.();
        s.subscribe = subscribe;
        s.unsub = subscribe(() => {
          if (!Object.is(s.get(), s.value)) this.schedule();
        });
      }
      return s.value;
    },
  };
}

/* ----------------------------- consultas ----------------------------- */

export function textOf(node: Child): string {
  return typeof node === 'string' ? node : node.children.map(textOf).join('');
}

function walk(node: HostNode, out: HostNode[] = []): HostNode[] {
  out.push(node);
  for (const c of node.children) if (typeof c !== 'string') walk(c, out);
  return out;
}

const matches = (text: string, m: string | RegExp) => (typeof m === 'string' ? text === m : m.test(text));

const roots = new Set<Root>();

export function render(element: React.ReactNode) {
  const root = new Root(element);
  roots.add(root);
  root.flush();

  const all = () => walk(root.tree);
  const queryAllByText = (m: string | RegExp) => {
    const hits = all().filter((n) => n.type === 'Text' && matches(textOf(n), m));
    return hits.filter((n) => !hits.some((o) => o !== n && isAncestor(n, o)));
  };
  const getByText = (m: string | RegExp) => {
    const hits = queryAllByText(m);
    if (hits.length === 0) throw new Error(`No se encontró texto ${String(m)}.\nTexto: ${textOf(root.tree)}`);
    return hits[0];
  };
  const queryAll = (pred: (n: HostNode) => boolean) => all().filter(pred);
  const getByProps = (props: Props) => {
    const hit = all().find((n) => Object.entries(props).every(([k, v]) => n.props[k] === v));
    if (!hit) throw new Error(`No se encontró nodo con ${JSON.stringify(props)}`);
    return hit;
  };
  const resolve = (target: string | RegExp | HostNode) =>
    typeof target === 'object' && !(target instanceof RegExp) ? target : getByText(target);
  const pressableOf = (target: string | RegExp | HostNode) => {
    let n: HostNode | null = resolve(target);
    while (n && !n.props.onPress) n = n.parent;
    if (!n) throw new Error(`Sin onPress: ${String(target)}`);
    return n;
  };
  const fire = (fn: () => unknown) => {
    root.batch++;
    let result: unknown;
    try {
      result = fn();
    } finally {
      root.batch--;
    }
    if (root.isDirty()) root.flush();
    return result;
  };

  return {
    get tree() {
      return root.tree;
    },
    text: () => textOf(root.tree),
    queryAllByText,
    queryByText: (m: string | RegExp) => queryAllByText(m)[0] ?? null,
    getByText,
    queryAll,
    getByProps,
    isDisabled: (target: string | RegExp | HostNode) => !!pressableOf(target).props.disabled,
    /** Pulsa el Pressable más cercano; falla si está deshabilitado. */
    press: (target: string | RegExp | HostNode) => {
      const p = pressableOf(target);
      if (p.props.disabled) throw new Error(`Botón deshabilitado: ${String(target)}`);
      return fire(() => p.props.onPress({}));
    },
    changeText: (target: HostNode | Props, value: string) => {
      const node = 'type' in target && 'parent' in target ? (target as HostNode) : getByProps(target);
      fire(() => node.props.onChangeText(value));
    },
    fire: (node: HostNode, prop: string, ...args: unknown[]) => fire(() => node.props[prop](...args)),
    rerender: () => root.flush(),
    unmount: () => {
      root.unmount();
      roots.delete(root);
    },
  };
}

function isAncestor(a: HostNode, b: HostNode) {
  let p = b.parent;
  while (p) {
    if (p === a) return true;
    p = p.parent;
  }
  return false;
}

/** Reintenta la aserción dejando correr microtareas y timers (React Query notifica con setTimeout). */
export async function waitFor<T>(assertion: () => T, timeoutMs = 1500): Promise<T> {
  const start = Date.now();
  for (;;) {
    try {
      return assertion();
    } catch (e) {
      if (Date.now() - start > timeoutMs) throw e;
      await new Promise((r) => setTimeout(r, 5));
    }
  }
}

/** Ejecuta un hook dentro de un componente de prueba y expone su último resultado. */
export function renderHook<T>(hook: () => T, wrapper?: (children: React.ReactNode) => React.ReactNode) {
  const result = { current: undefined as T };
  function HookProbe() {
    result.current = hook();
    return null;
  }
  const probe = React.createElement(HookProbe);
  const view = render(wrapper ? wrapper(probe) : probe);
  return { result, ...view };
}

export function cleanup() {
  for (const r of roots) r.unmount();
  roots.clear();
}

afterEach(cleanup);
