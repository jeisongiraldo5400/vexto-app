import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/core/http/api-error';
import { toLocalYmd } from '@/core/utils/date';
import { makeUser, signInAs, withQuery } from '@/test-utils/fixtures';
import { render, waitFor } from '@/test-utils/renderer';

import { ExpensesScreen } from './expenses-screen';

const { apiFetch, postIdempotent } = vi.hoisted(() => ({ apiFetch: vi.fn(), postIdempotent: vi.fn() }));
vi.mock('@/core/http/api', () => ({ apiFetch }));
vi.mock('@/core/http/idempotent', async (orig) => ({
  ...(await orig<typeof import('@/core/http/idempotent')>()),
  postIdempotent,
}));

const gasto = { id: 'g1', concepto: 'Arriendo', monto: '1500000.00' as unknown as number, fecha: '2026-10-01T00:00:00Z' };
let gastos: { gastos: unknown[]; total: number } = { gastos: [gasto], total: 1 };

const ALL = ['gastos:ver', 'gastos:crear', 'gastos:editar', 'gastos:eliminar'];

beforeEach(() => {
  vi.clearAllMocks();
  gastos = { gastos: [gasto], total: 1 };
  signInAs(makeUser(ALL, ['finanzas']));
  apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('gastos?')) return gastos;
    if (path.startsWith('categorias-gasto')) return { categorias: [{ id: 'cat1', nombre: 'Servicios' }] };
    if (path === 'metodos-pago') return [{ id: 'mp1', nombre: 'Efectivo' }];
    return {};
  });
  postIdempotent.mockResolvedValue({});
});

const lastAlertButtons = () => vi.mocked(Alert.alert).mock.calls.at(-1)![2]!;

describe('ExpensesScreen', () => {
  it('lista gastos con monto en formato es-CO', async () => {
    const view = render(withQuery(<ExpensesScreen />));
    expect(view.queryAll((n) => n.type === 'ActivityIndicator')).toHaveLength(1);
    await waitFor(() => view.getByText('Arriendo · $1.500.000 · 2026-10-01'));
  });

  it('error de carga ofrece reintento', async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(500, 'Caído'));
    const view = render(withQuery(<ExpensesScreen />));
    await waitFor(() => view.getByText('Reintentar: Caído'));
    view.press('Reintentar: Caído');
    await waitFor(() => view.getByText(/Arriendo/));
  });

  it('solo ver: sin botones de crear/editar/eliminar', async () => {
    signInAs(makeUser(['gastos:ver'], ['finanzas']));
    const view = render(withQuery(<ExpensesScreen />));
    await waitFor(() => view.getByText(/Arriendo/));
    expect(view.queryByText('Nuevo gasto')).toBeNull();
    expect(view.queryByText('Editar')).toBeNull();
    expect(view.queryByText('Eliminar')).toBeNull();
  });

  it('valida el formulario antes de enviar', async () => {
    const view = render(withQuery(<ExpensesScreen />));
    await waitFor(() => view.getByText(/Arriendo/));
    view.press('Nuevo gasto');
    view.changeText({ placeholder: 'Concepto' }, 'Luz');
    view.changeText({ placeholder: 'Monto' }, '1.50.0');
    view.press('Guardar');
    expect(Alert.alert).toHaveBeenCalledWith('Revisa concepto, monto y fecha');
    expect(postIdempotent).not.toHaveBeenCalled();
  });

  it('crea con monto es-CO e intención idempotente reutilizada en el reintento', async () => {
    const view = render(withQuery(<ExpensesScreen />));
    await waitFor(() => view.getByText(/Arriendo/));
    view.press('Nuevo gasto');
    view.changeText({ placeholder: 'Concepto' }, '  Luz ');
    view.changeText({ placeholder: 'Monto' }, '$ 85.000,50');
    view.press('Categoría: Seleccionar');
    view.press('Servicios');
    postIdempotent.mockRejectedValueOnce(new ApiError(0, 'Red'));
    view.press('Guardar');
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('No se pudo guardar', 'Red'));
    view.press('Guardar');
    await waitFor(() => expect(postIdempotent).toHaveBeenCalledTimes(2));

    const [[path, body, intent], [, , retryIntent]] = postIdempotent.mock.calls;
    expect(path).toBe('gastos');
    expect(body).toEqual({
      concepto: 'Luz',
      monto: 85000.5,
      fecha: toLocalYmd(),
      categoriaId: 'cat1',
      metodoPagoId: undefined,
      observaciones: undefined,
    });
    expect(retryIntent).toBe(intent);
    await waitFor(() => expect(view.queryByText('Guardar')).toBeNull());
  });

  it('cada gasto nuevo usa una intención distinta', async () => {
    const view = render(withQuery(<ExpensesScreen />));
    await waitFor(() => view.getByText(/Arriendo/));
    for (const concepto of ['A', 'B']) {
      view.press('Nuevo gasto');
      view.changeText({ placeholder: 'Concepto' }, concepto);
      view.changeText({ placeholder: 'Monto' }, '1.000');
      view.press('Guardar');
      await waitFor(() => expect(view.queryByText('Guardar')).toBeNull());
    }
    expect(postIdempotent.mock.calls[0][2]).not.toBe(postIdempotent.mock.calls[1][2]);
  });

  it('edita con PUT precargando el monto formateado', async () => {
    const view = render(withQuery(<ExpensesScreen />));
    await waitFor(() => view.getByText(/Arriendo/));
    view.press('Editar');
    expect(view.getByProps({ placeholder: 'Monto' }).props.value).toBe('1.500.000');
    view.press('Guardar');
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('gastos/g1', {
        method: 'PUT',
        body: expect.objectContaining({ concepto: 'Arriendo', monto: 1500000, fecha: '2026-10-01' }),
      }),
    );
  });

  it('eliminar confirma y vuelve a la página anterior si queda vacía', async () => {
    gastos = { gastos: [gasto], total: 21 };
    const view = render(withQuery(<ExpensesScreen />));
    await waitFor(() => view.getByText(/Arriendo/));
    view.press('Siguiente');
    await waitFor(() => view.getByText('Página 2'));
    await waitFor(() => view.getByText(/Arriendo/));
    view.press('Eliminar');
    gastos = { gastos: [], total: 20 };
    lastAlertButtons()[1].onPress!();
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('gastos/g1', { method: 'DELETE' }));
    await waitFor(() => view.getByText('Página 1'));
  });
});
