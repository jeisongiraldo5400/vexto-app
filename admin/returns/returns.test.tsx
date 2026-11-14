import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { router, useLocalSearchParams } from '@/test-utils/expo-router';
import { makeUser, signInAs, withQuery } from '@/test-utils/fixtures';
import { render, renderHook, waitFor } from '@/test-utils/renderer';

import { cargarVentaParaDevolucion, fetchDevoluciones } from './adapters';
import { DevolucionCreateScreen } from './devolucion-create-screen';
import { DevolucionDetailScreen } from './devolucion-detail-screen';
import { DevolucionesListScreen } from './devoluciones-list-screen';
import { useDevolucionForm } from './hooks';

const { apiFetch, postIdempotent } = vi.hoisted(() => ({ apiFetch: vi.fn(), postIdempotent: vi.fn() }));
vi.mock('@/core/http/api', () => ({ apiFetch }));
vi.mock('@/core/http/idempotent', async (orig) => ({
  ...(await orig<typeof import('@/core/http/idempotent')>()),
  postIdempotent,
}));

const dev = {
  id: 'd1',
  numeroDevolucion: 'DEV-2026-0001',
  tipo: 'cliente',
  ventaId: 'v1',
  clienteNombre: 'Ana',
  almacenId: 'a1',
  almacenNombre: 'Principal',
  motivo: 'Defecto',
  estado: 'registrada',
  total: '50000.00',
  items: [{ productoId: 'p1', productoNombre: 'Cable', cantidad: '1', precioUnitario: '50000' }],
  createdAt: '2026-10-20T10:00:00Z',
};
const ventaDev = {
  id: 'v1',
  numeroFactura: 'FV-7',
  clienteNombre: 'Ana',
  almacenId: 'a1',
  almacenNombre: 'Principal',
  estado: 'completada',
  items: [
    { productoId: 'p1', productoNombre: 'Cable', productoCodigo: 'C', cantidad: 3, cantidadYaDevuelta: 1, cantidadPendienteDevolver: 2 },
    { productoId: 'p2', productoNombre: 'Funda', productoCodigo: 'F', cantidad: 1, cantidadYaDevuelta: 1, cantidadPendienteDevolver: 0 },
  ],
};
const lastAlertButtons = () => vi.mocked(Alert.alert).mock.calls.at(-1)![2]!;

beforeEach(() => {
  vi.clearAllMocks();
  useLocalSearchParams.mockReturnValue({ id: 'd1' });
  signInAs(makeUser(['devoluciones:ver', 'devoluciones:crear', 'devoluciones:eliminar'], ['ventas']));
  apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('devoluciones?')) return { devoluciones: [dev], total: 1 };
    if (path === 'devoluciones/d1') return dev;
    if (path.startsWith('devoluciones/cliente/cargar-venta')) return ventaDev;
    return undefined;
  });
  postIdempotent.mockResolvedValue({ id: 'd2' });
});

describe('adapters de devoluciones', () => {
  it('lista por tipo y carga la venta por factura codificada', async () => {
    const page = await fetchDevoluciones('cliente', 1);
    expect(apiFetch).toHaveBeenCalledWith('devoluciones?pagina=1&limite=20&tipo=cliente');
    expect(page.devoluciones[0].total).toBe(50000);
    await cargarVentaParaDevolucion(' FV 7 ');
    expect(apiFetch).toHaveBeenLastCalledWith('devoluciones/cliente/cargar-venta?numeroFactura=FV%207');
  });
});

describe('useDevolucionForm', () => {
  it('valida cantidades contra lo pendiente y arma el payload', async () => {
    const { result } = renderHook(() => useDevolucionForm());
    result.current.setFactura('FV-7');
    await result.current.buscar();
    expect(result.current.error).toBe('Indica al menos una cantidad a devolver.');
    result.current.setCantidad('p1', '3');
    expect(result.current.error).toBe('Una cantidad supera lo pendiente por devolver.');
    result.current.setCantidad('p1', '2');
    result.current.setMotivo(' Defecto ');
    expect(result.current.error).toBeNull();
    expect(result.current.unidades).toBe(2);
    await result.current.submit();
    expect(postIdempotent).toHaveBeenCalledWith(
      'devoluciones/cliente',
      { ventaId: 'v1', almacenId: 'a1', items: [{ productoId: 'p1', cantidad: 2 }], motivo: 'Defecto' },
      expect.any(String),
    );
  });
});

describe('pantallas de devoluciones', () => {
  it('lista y abre detalle; alta según permiso', async () => {
    const view = render(withQuery(<DevolucionesListScreen />));
    await waitFor(() => view.getByText('DEV-2026-0001 · Registrada'));
    view.press('DEV-2026-0001 · Registrada');
    expect(router.push).toHaveBeenLastCalledWith('/(app)/devoluciones/d1');
    view.press('Nueva devolución');
    expect(router.push).toHaveBeenLastCalledWith('/(app)/devoluciones/nueva');
  });

  it('anular pide confirmación', async () => {
    const view = render(withQuery(<DevolucionDetailScreen />));
    await waitFor(() => view.getByText('Cable × 1 · $50.000'));
    view.press('Anular devolución');
    expect(apiFetch).not.toHaveBeenCalledWith('devoluciones/d1/anular', expect.anything());
    lastAlertButtons()[1].onPress!();
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('devoluciones/d1/anular', { method: 'POST', body: {} }));
  });

  it('sin devoluciones:eliminar o anulada: sin botón anular', async () => {
    signInAs(makeUser(['devoluciones:ver'], ['ventas']));
    const view = render(withQuery(<DevolucionDetailScreen />));
    await waitFor(() => view.getByText('Cable × 1 · $50.000'));
    expect(view.queryByText('Anular devolución')).toBeNull();
  });

  it('alta: carga venta, cantidades, confirma y abre el detalle', async () => {
    const view = render(withQuery(<DevolucionCreateScreen />));
    view.changeText({ placeholder: 'Número de factura' }, 'FV-7');
    view.press('Cargar venta');
    await waitFor(() => view.getByText('Vendidas 3 · devueltas 1 · pendientes 2'));
    view.getByText('Ya se devolvió todo.');
    view.changeText({ placeholder: 'Devolver de Cable' }, '1');
    view.press('Registrar devolución');
    expect(vi.mocked(Alert.alert).mock.calls.at(-1)![1]).toMatch(/1 unidad\(es\) al inventario de Principal/);
    lastAlertButtons()[1].onPress!();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/(app)/devoluciones/d2'));
  });
});

describe('devolución con módulo caja', () => {
  it('reembolso opcional: con monto exige método y viaja en el payload', async () => {
    signInAs(makeUser(['devoluciones:ver', 'devoluciones:crear'], ['ventas', 'caja']));
    const base = apiFetch.getMockImplementation()!;
    apiFetch.mockImplementation(async (path: string, init?: unknown) =>
      path === '/metodos-pago'
        ? [{ id: 'cash', nombre: 'Efectivo', codigo: 'efectivo', estado: 'activo', esEfectivo: true }]
        : base(path, init),
    );
    const { result } = renderHook(() => useDevolucionForm(), withQuery);
    result.current.setFactura('FV-7');
    await result.current.buscar();
    await waitFor(() => expect(result.current.venta).not.toBeNull());
    result.current.setCantidad('p1', '1');
    expect(result.current.error).toBeNull();
    result.current.setRefundAmount('10.000');
    expect(result.current.error).toBe('Selecciona el método del reembolso.');
    result.current.setRefundMethod('cash');
    expect(result.current.error).toBeNull();
    await result.current.submit();
    expect(postIdempotent.mock.calls[0][1]).toMatchObject({ reembolso: { metodoPagoId: 'cash', monto: 10000 } });
  });

  it('sin módulo caja el payload no cambia y no hay campos de reembolso', async () => {
    const view = render(withQuery(<DevolucionCreateScreen />));
    view.changeText({ placeholder: 'Número de factura' }, 'FV-7');
    view.press('Cargar venta');
    await waitFor(() => view.getByText('FV-7'));
    expect(view.queryByText(/reembolsar/i)).toBeNull();
  });
});
