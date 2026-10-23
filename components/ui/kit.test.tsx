import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useActionRunner } from '@/core/query/use-action-runner';
import { createTestQueryClient, withQuery } from '@/test-utils/fixtures';
import { render, renderHook } from '@/test-utils/renderer';

import { ActionButton, Pager, QueryState } from './kit';

beforeEach(() => vi.clearAllMocks());

describe('ActionButton', () => {
  it('con confirm solo ejecuta tras aceptar', () => {
    const onPress = vi.fn();
    const view = render(<ActionButton label="Borrar" onPress={onPress} confirm={{ title: 'T', message: 'M' }} />);
    view.press('Borrar');
    expect(onPress).not.toHaveBeenCalled();
    const buttons = vi.mocked(Alert.alert).mock.calls[0][2]!;
    buttons[0].onPress?.();
    expect(onPress).not.toHaveBeenCalled();
    buttons[1].onPress!();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('deshabilitado o ocupado no se puede pulsar', () => {
    const view = render(<ActionButton label="Guardar" onPress={vi.fn()} disabled />);
    expect(view.isDisabled('Guardar')).toBe(true);
    const busy = render(<ActionButton label="Guardar2" onPress={vi.fn()} busy />);
    expect(busy.queryByText('Guardar2')).toBeNull();
    expect(busy.queryAll((n) => n.type === 'ActivityIndicator')).toHaveLength(1);
  });
});

describe('Pager y QueryState', () => {
  it('Pager limita a las páginas existentes', () => {
    const onChange = vi.fn();
    const view = render(<Pager page={1} pageSize={20} total={45} onChange={onChange} />);
    view.getByText('Página 1 de 3');
    expect(view.isDisabled('Anterior')).toBe(true);
    view.press('Siguiente');
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('QueryState muestra error con reintento, carga o vacío', () => {
    const onRetry = vi.fn();
    const err = render(<QueryState isLoading={false} error={new Error('Caído')} onRetry={onRetry} />);
    err.getByText('Caído');
    err.press('Reintentar');
    expect(onRetry).toHaveBeenCalled();
    const empty = render(<QueryState isLoading={false} error={null} onRetry={onRetry} empty="Nada" />);
    empty.getByText('Nada');
  });
});

describe('useActionRunner', () => {
  it('bloquea reentradas, invalida tras el éxito y avisa errores', async () => {
    const client = createTestQueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useActionRunner([['separados'], ['stock']]), (c) => withQuery(c, client));
    let release!: () => void;
    const first = result.current.run(() => new Promise<void>((r) => (release = r)));
    expect(await result.current.run(async () => {})).toBe(false);
    release();
    expect(await first).toBe(true);
    expect(spy).toHaveBeenCalledWith({ queryKey: ['separados'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['stock'] });
    expect(await result.current.run(async () => { throw new Error('Falla'); })).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith('No se pudo completar', 'Falla');
  });
});
