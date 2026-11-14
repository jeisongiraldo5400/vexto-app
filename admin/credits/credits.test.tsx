import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/core/http/api-error';
import { router, useLocalSearchParams } from '@/test-utils/expo-router';
import { makeUser, signInAs, withQuery } from '@/test-utils/fixtures';
import { render, renderHook, waitFor } from '@/test-utils/renderer';

import { fetchAbonosCredito, fetchCreditos, puedeAbonar, saldoTotal } from './adapters';
import { CreditoDetailScreen } from './credito-detail-screen';
import { CreditosListScreen } from './creditos-list-screen';
import { useAbonoCreditoForm } from './hooks';

const { apiFetch, postIdempotent } = vi.hoisted(() => ({ apiFetch: vi.fn(), postIdempotent: vi.fn() }));
vi.mock('@/core/http/api', () => ({ apiFetch }));
vi.mock('@/core/http/idempotent', async (orig) => ({
  ...(await orig<typeof import('@/core/http/idempotent')>()),
  postIdempotent,
}));

const credito = {
  id: 'cr1',
  ventaId: 'v1',
  clienteId: 'c1',
  clienteNombre: 'Ana Pérez',
  numeroFactura: 'FV-10',
  montoTotal: '300000.00',
  saldoPendiente: '200000.00',
  saldoPendienteTotal: '200000.00',
  estado: 'parcial',
  fechaVencimiento: '2026-12-01',
  cuotaInicial: '50000.00',
  cuotas: [{ id: 'q1', numero: 1, monto: '125000', saldoPendiente: '75000', fechaVencimiento: '2026-11-01', estado: 'parcial' }],
  items: [{ productoId: 'p1', productoNombre: 'Celular', cantidad: 1, precioUnitario: 300000, total: 357000 }],
};

const lastAlertButtons = () => vi.mocked(Alert.alert).mock.calls.at(-1)![2]!;

beforeEach(() => {
  vi.clearAllMocks();
  useLocalSearchParams.mockReturnValue({ id: 'cr1' });
  signInAs(makeUser(['ventas:ver', 'ventas:crear', 'pagos:ver', 'pagos:crear'], ['ventas', 'pagos']));
  apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('creditos?')) return { creditos: [credito], total: 1 };
    if (path === 'creditos/cr1') return credito;
    if (path === 'pagos/venta/v1')
      return [
        { id: 'pg1', creditoId: 'cr1', monto: '50000.00', estado: 'completado', metodoPagoNombre: 'Efectivo', fechaPago: '2026-10-10' },
        { id: 'pg2', creditoId: null, monto: '50000.00', estado: 'completado', metodoPagoNombre: 'Efectivo', fechaPago: '2026-10-01' },
      ];
    if (path === '/metodos-pago')
      return [
        { id: 'm1', nombre: 'Efectivo', codigo: 'efectivo', estado: 'activo' },
        { id: 'm2', nombre: 'Crédito', codigo: 'credito', estado: 'activo' },
      ];
    return {};
  });
  postIdempotent.mockResolvedValue({ id: 'pg9', creditoLiquidado: false });
});

describe('adapters de créditos', () => {
  it('lista por estado y normaliza montos', async () => {
    const page = await fetchCreditos('parcial', 2);
    expect(apiFetch).toHaveBeenCalledWith('creditos?pagina=2&limite=20&estado=parcial');
    expect(page.creditos[0]).toMatchObject({ montoTotal: 300000, saldoPendiente: 200000 });
  });

  it('saldo y estados abonables', () => {
    expect(saldoTotal({ saldoPendiente: 10, saldoPendienteTotal: 15 })).toBe(15);
    expect(saldoTotal({ saldoPendiente: 10 })).toBe(10);
    expect(puedeAbonar({ estado: 'pendiente' })).toBe(true);
    expect(puedeAbonar({ estado: 'pagado' })).toBe(false);
  });

  it('abonos: solo los pagos de este crédito', async () => {
    const abonos = await fetchAbonosCredito('v1', 'cr1');
    expect(abonos.map((a) => a.id)).toEqual(['pg1']);
    expect(abonos[0].monto).toBe(50000);
  });
});

describe('useAbonoCreditoForm', () => {
  const c = { id: 'cr1', ventaId: 'v1', saldoPendiente: 200000, saldoPendienteTotal: 200000 };

  it('exige método y monto dentro del saldo', () => {
    const { result } = renderHook(() => useAbonoCreditoForm(c));
    result.current.setAmount('50.000');
    expect(result.current.invalid).toBe(true);
    result.current.setMethod('m1');
    expect(result.current.invalid).toBe(false);
    result.current.setAmount('250.000');
    expect(result.current.error).toBe('El abono supera el saldo pendiente');
  });

  it('POST /pagos idempotente; reintento con la misma intención', async () => {
    const { result } = renderHook(() => useAbonoCreditoForm(c));
    result.current.setMethod('m1');
    result.current.setAmount('50.000');
    result.current.setNotes(' cuota ');
    postIdempotent.mockRejectedValueOnce(new ApiError(503, 'Caído'));
    await expect(result.current.pay()).rejects.toThrow('Caído');
    await result.current.pay();
    const [[path, body, i1], [, , i2]] = postIdempotent.mock.calls;
    expect(path).toBe('pagos');
    expect(body).toEqual({ ventaId: 'v1', creditoId: 'cr1', monto: 50000, metodoPagoId: 'm1', observaciones: 'cuota' });
    expect(i2).toBe(i1);
    expect(result.current.amount).toBe('');
  });
});

describe('pantallas de créditos', () => {
  it('lista y navega al detalle', async () => {
    const view = render(withQuery(<CreditosListScreen />));
    await waitFor(() => view.getByText('FV-10 · Parcial'));
    view.getByText('Total $300.000 · Saldo $200.000');
    view.press('FV-10 · Parcial');
    expect(router.push).toHaveBeenLastCalledWith('/(app)/creditos/cr1');
  });

  it('detalle: cuotas, abonos del crédito y sin IVA', async () => {
    const view = render(withQuery(<CreditoDetailScreen />));
    await waitFor(() => view.getByText('Saldo pendiente: $200.000'));
    view.getByText('Celular × 1 · $300.000');
    expect(view.text()).not.toMatch(/IVA|357\.000/);
    await waitFor(() => view.getByText(/\$50\.000 · Efectivo · completado/));
    expect(view.queryAllByText(/· Efectivo · completado/)).toHaveLength(1);
  });

  it('abono con método (sin crédito interno) y confirmación', async () => {
    const view = render(withQuery(<CreditoDetailScreen />));
    await waitFor(() => view.getByText('Método de pago: Seleccionar'));
    view.press('Método de pago: Seleccionar');
    await waitFor(() => view.getByText('Efectivo'));
    expect(view.queryByText('Crédito')).toBeNull();
    view.press('Efectivo');
    view.changeText({ placeholder: 'Monto del abono' }, '20.000');
    view.press(view.queryAllByText('Registrar abono').at(-1)!);
    expect(vi.mocked(Alert.alert).mock.calls.at(-1)![1]).toBe('¿Abonar $20.000 al crédito FV-10?');
    lastAlertButtons()[1].onPress!();
    await waitFor(() => expect(postIdempotent).toHaveBeenCalledTimes(1));
    expect(postIdempotent.mock.calls[0][1]).toMatchObject({ monto: 20000, metodoPagoId: 'm1' });
  });

  it('sin licencia de pagos: no muestra abonos ni formulario', async () => {
    signInAs(makeUser(['ventas:ver', 'ventas:crear'], ['ventas']));
    const view = render(withQuery(<CreditoDetailScreen />));
    await waitFor(() => view.getByText('Saldo pendiente: $200.000'));
    expect(view.queryByText('Abonos')).toBeNull();
    expect(view.queryByText('Registrar abono')).toBeNull();
    expect(apiFetch).not.toHaveBeenCalledWith('pagos/venta/v1');
  });

  it('crédito pagado: no permite abonar', async () => {
    apiFetch.mockImplementation(async (path: string) =>
      path === 'creditos/cr1' ? { ...credito, estado: 'pagado', saldoPendiente: 0, saldoPendienteTotal: 0 } : [],
    );
    const view = render(withQuery(<CreditoDetailScreen />));
    await waitFor(() => view.getByText('FV-10 · Pagado'));
    expect(view.queryByText('Registrar abono')).toBeNull();
  });
});
