import { beforeEach, describe, expect, it, vi } from 'vitest';

import AppGroupLayout from '@/app/(app)/_layout';
import TabLayout from '@/app/(app)/(tabs)/_layout';
import Index from '@/app/index';
import LoginScreen from '@/admin/auth/login-screen';
import SelectEmpresaScreen from '@/admin/auth/select-empresa-screen';
import { makeUser, signInAs, withQuery } from '@/test-utils/fixtures';
import { usePathname } from '@/test-utils/expo-router';
import { render, type HostNode } from '@/test-utils/renderer';

vi.mock('@/core/session/use-capabilities-sync', () => ({ useCapabilitiesSync: vi.fn() }));
vi.mock('@/admin/auth/components/login-form', () => ({ LoginForm: () => 'LOGIN_FORM' }));
vi.mock('@/admin/auth/components/select-empresa-list', () => ({ SelectEmpresaList: () => 'EMPRESAS' }));
vi.mock('@/components/haptic-tab', () => ({ HapticTab: () => null }));

const redirectOf = (view: ReturnType<typeof render>) =>
  view.queryAll((n) => n.type === 'Redirect')[0]?.props.href as string | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  usePathname.mockReturnValue('/inicio');
});

describe('app/index (arranque)', () => {
  it('espera a hidratar, luego redirige según la sesión', () => {
    signInAs(null, { isReady: false });
    const loading = render(<Index />);
    expect(loading.queryAll((n) => n.type === 'ActivityIndicator')).toHaveLength(1);
    loading.unmount();

    signInAs(null);
    expect(redirectOf(render(<Index />))).toBe('/(auth)/login');
    signInAs(makeUser([], []), { needsCompanyPick: true });
    expect(redirectOf(render(<Index />))).toBe('/(auth)/select-empresa');
    signInAs(makeUser([], []));
    expect(redirectOf(render(<Index />))).toBe('/(app)/(tabs)/venta');
  });
});

describe('pantallas de auth', () => {
  it('login muestra el formulario salvo con sesión completa', () => {
    signInAs(null);
    expect(render(<LoginScreen />).text()).toBe('LOGIN_FORM');
    signInAs(makeUser([], []), { needsCompanyPick: true });
    expect(render(<LoginScreen />).text()).toBe('LOGIN_FORM');
    signInAs(makeUser([], []));
    expect(redirectOf(render(<LoginScreen />))).toBe('/');
  });

  it('select-empresa solo con sesión pendiente de empresa', () => {
    signInAs(makeUser([], []), { needsCompanyPick: true });
    expect(render(<SelectEmpresaScreen />).text()).toBe('EMPRESAS');
    signInAs(null);
    expect(redirectOf(render(<SelectEmpresaScreen />))).toBe('/');
    signInAs(makeUser([], []));
    expect(redirectOf(render(<SelectEmpresaScreen />))).toBe('/');
  });
});

describe('guardia de (app)/_layout por canOpenPath', () => {
  it('sin sesión o con empresa pendiente vuelve al inicio de la app', () => {
    signInAs(null);
    expect(redirectOf(render(<AppGroupLayout />))).toBe('/');
    signInAs(makeUser([], []), { needsCompanyPick: true });
    expect(redirectOf(render(<AppGroupLayout />))).toBe('/');
  });

  it.each([
    ['/gastos', ['gastos:ver'], ['finanzas'], true],
    ['/gastos', ['gastos:ver'], [], false],
    ['/reparacion/nueva', ['reparaciones:crear'], ['reparaciones'], true],
    ['/reparacion/abc', ['reparaciones:crear'], ['reparaciones'], false],
    ['/venta', ['pos:crear'], ['pos'], true],
    ['/venta', [], ['pos'], false],
    ['/inicio', [], [], true],
  ])('%s con %j / %j → permitido=%s', (path, permisos, modulos, allowed) => {
    signInAs(makeUser(permisos, modulos));
    usePathname.mockReturnValue(path);
    const view = render(<AppGroupLayout />);
    if (allowed) {
      expect(redirectOf(view)).toBeUndefined();
      expect(view.queryAll((n) => n.type === 'Stack')).toHaveLength(1);
    } else {
      expect(redirectOf(view)).toBe('/(app)/(tabs)/inicio');
    }
  });
});

describe('pestañas (tabs/_layout)', () => {
  const hrefs = (view: ReturnType<typeof render>) =>
    Object.fromEntries(
      view
        .queryAll((n: HostNode) => n.type === 'Tabs.Screen')
        .map((n) => [n.props.name, (n.props.options as { href?: unknown }).href]),
    );

  it('oculta Venta y Reparaciones sin permiso o sin licencia', () => {
    signInAs(makeUser(['ventas:crear', 'reparaciones:ver'], []));
    const h = hrefs(render(withQuery(<TabLayout />)));
    expect(h.venta).toBeNull();
    expect(h.reparaciones).toBeNull();
    expect(h.inicio).toBeUndefined();
    expect(h.mas).toBeUndefined();
  });

  it('muestra Venta y Reparaciones con permiso y licencia', () => {
    signInAs(makeUser(['ventas:crear', 'reparaciones:ver'], ['pos', 'reparaciones']));
    const h = hrefs(render(withQuery(<TabLayout />)));
    expect(h.venta).toBeUndefined();
    expect(h.reparaciones).toBeUndefined();
    // Productos y Chat nunca aparecen como pestaña.
    expect(h.productos).toBeNull();
    expect(h['chat-venta']).toBeNull();
  });
});
