import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/core/http/api-error';
import { router } from '@/test-utils/expo-router';
import { makeUser, signInAs, withQuery } from '@/test-utils/fixtures';
import { render, renderHook, waitFor } from '@/test-utils/renderer';

import { calcularSaldoVenta, fetchPagos, fetchVentaPagable } from './adapters';
import { usePagoForm } from './hooks';
import { PagoCreateScreen } from './pago-create-screen';
import { PagosListScreen } from './pagos-list-screen';

const { apiFetch, postIdempotent } = vi.hoisted(() => ({ apiFetch: vi.fn(), postIdempotent: vi.fn() }));
vi.mock('@/core/http/api', () => ({ apiFetch }));
vi.mock('@/core/http/idempotent', async (orig) => ({
  ...(await orig<typeof import('@/core/http/idempotent')>()),
  postIdempotent,
}));

const venta = { id: 'v1', numeroFactura: 'FV-7', clienteNombre: 'Ana', total: '100000.00', saldoPendiente: null };
const pago = { id: 'pg1', ventaId: 'v1', creditoId: null, clienteNombre: 'Ana', numeroFactura: 'FV-7', monto: '40000.00', estado: 'completado', metodoPagoNombre: 'Efectivo', fechaPago: '2026-10-20' };
const lastAlertButtons = () => vi.mocked(Alert.alert).mock.calls.at(-1)![2]!;

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(makeUser(['pagos:ver', 'pagos:crear'], ['pagos']));
  apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('pagos?')) return { pagos: [pago], total: 1 };
    if (path === 'ventas/numero/FV-7') return venta;
    if (path === 'pagos/venta/v1') return [pago, { ...pago, id: 'pg2', estado: 'cancelado' }];
    if (path === '/metodos-pago') return [{ id: 'm1', nombre: 'Nequi', codigo: 'nequi', estado: 'activo' }];
    throw new ApiError(404, 'Venta no encontrada');
  });
  postIdempotent.mockResolvedValue({ id: 'pg3' });
});

describe('adapters de pagos', () => {
  it('saldo: usa saldoPendiente o total menos pagos abonados', () => {
    expect(calcularSaldoVenta({ total: 100, saldoPendiente: 30 })).toBe(30);
    expect(
      calcularSaldoVenta({ total: 100, saldoPendiente: null }, [
        { monto: 40, estado: 'completado' },
        { monto: 10, estado: 'parcial' },
        { monto: 50, estado: 'cancelado' },
      ]),
    ).toBe(50);
    expect(calcularSaldoVenta({ total: 10 }, [{ monto: 40, estado: 'completado' }])).toBe(0);
  });

  it('lista con estado y busca venta por factura', async () => {
    await fetchPagos('completado', 1);
    expect(apiFetch).toHaveBeenCalledWith('pagos?pagina=1&limite=20&estado=completado');
    const res = await fetchVentaPagable(' FV-7 ');
    expect(res.saldo).toBe(60000);
  });
});

describe('usePagoForm', () => {
  it('precarga el saldo y paga con intención reutilizada en el reintento', async () => {
    const { result } = renderHook(() => usePagoForm());
    result.current.setFactura('FV-7');
    await result.current.buscar();
    expect(result.current.amount).toBe('60.000');
    result.current.setMethod('m1');
    result.current.setAmount('70.000');
    expect(result.current.error).toBe('El pago supera el saldo pendiente');
    result.current.setAmount('60.000');
    result.current.setReference(' ABC ');
    postIdempotent.mockRejectedValueOnce(new ApiError(0, 'Red'));
    await expect(result.current.pay()).rejects.toThrow('Red');
    await result.current.pay();
    const [[path, body, i1], [, , i2]] = postIdempotent.mock.calls;
    expect(path).toBe('pagos');
    expect(body).toEqual({ ventaId: 'v1', monto: 60000, metodoPagoId: 'm1', referencia: 'ABC', observaciones: undefined });
    expect(i2).toBe(i1);
  });

  it('factura inexistente muestra error', async () => {
    const { result } = renderHook(() => usePagoForm());
    result.current.setFactura('NO');
    await result.current.buscar();
    expect(result.current.lookupError).toBe('Venta no encontrada');
    expect(result.current.venta).toBeNull();
  });
});

describe('pantallas de pagos', () => {
  it('lista pagos y abre el registro con permiso', async () => {
    const view = render(withQuery(<PagosListScreen />));
    await waitFor(() => view.getByText('$40.000 · Completado'));
    view.press('Registrar pago');
    expect(router.push).toHaveBeenLastCalledWith('/(app)/pagos/nuevo');
  });

  it('sin pagos:crear no ofrece registrar', async () => {
    signInAs(makeUser(['pagos:ver'], ['pagos']));
    const view = render(withQuery(<PagosListScreen />));
    await waitFor(() => view.getByText('$40.000 · Completado'));
    expect(view.queryByText('Registrar pago')).toBeNull();
  });

  it('registro: busca, confirma el monto y vuelve', async () => {
    const view = render(withQuery(<PagoCreateScreen />));
    view.changeText({ placeholder: 'Número de factura' }, 'FV-7');
    view.press('Buscar venta');
    await waitFor(() => view.getByText('Saldo pendiente: $60.000'));
    view.press('Método de pago: Seleccionar');
    await waitFor(() => view.getByText('Nequi'));
    view.press('Nequi');
    view.press(view.queryAllByText('Registrar pago').at(-1)!);
    expect(vi.mocked(Alert.alert).mock.calls.at(-1)![1]).toBe('¿Registrar $60.000 a la factura FV-7?');
    lastAlertButtons()[1].onPress!();
    await waitFor(() => expect(router.back).toHaveBeenCalled());
  });
});
