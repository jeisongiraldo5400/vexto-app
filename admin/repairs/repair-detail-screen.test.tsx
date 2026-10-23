import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/core/http/api-error';
import { makeUser, signInAs, withQuery } from '@/test-utils/fixtures';
import { useLocalSearchParams } from '@/test-utils/expo-router';
import { render, waitFor } from '@/test-utils/renderer';

import type { RepairDetail } from './adapters';
import { RepairDetailScreen } from './repair-detail-screen';

const { apiFetch, postIdempotent } = vi.hoisted(() => ({ apiFetch: vi.fn(), postIdempotent: vi.fn() }));
vi.mock('@/core/http/api', () => ({ apiFetch }));
vi.mock('@/core/http/idempotent', async (orig) => ({
  ...(await orig<typeof import('@/core/http/idempotent')>()),
  postIdempotent,
}));
vi.mock('./repair-photo-modal', () => ({ RepairPhotoModal: () => null }));

const order: RepairDetail = {
  id: 'r1',
  orderNumber: 'OR-0001',
  status: 'READY_FOR_PICKUP',
  priority: 'NORMAL',
  reportedIssue: 'No enciende',
  customerId: 'c1',
  deviceId: 'd1',
  technicianId: null,
  cliente: { nombre: 'Carlos' },
  equipo: { imei: '356000' },
  pagos: [{ id: 'p1', monto: '50000.00', estado: 'completado', fecha_pago: '2026-10-01' }],
  saldo: { total: 150000, pagado: 50000, pendiente: 100000 },
  cotizaciones: [{ id: 'q1', status: 'APPROVED', total: '150000.00' }],
};
const resources = {
  clientes: [],
  equipos: [],
  tipos: [],
  tecnicos: [{ id: 't1', nombre: 'Luis' }],
  productos: [],
  almacenes: [],
  metodos: [{ id: 'efectivo', nombre: 'Efectivo' }],
};

function routeApi(detail: unknown = order) {
  apiFetch.mockImplementation(async (path: string) => {
    if (path === 'reparaciones/r1') return detail;
    if (path === 'reparaciones/catalogos/operacion') return resources;
    return {};
  });
}

const ALL = [
  'reparaciones:ver',
  'reparaciones:editar',
  'reparaciones:entregar',
  'reparaciones:cancelar',
  'reparaciones:asignar',
  'cotizaciones:ver',
  'garantias:ver',
];

beforeEach(() => {
  vi.clearAllMocks();
  useLocalSearchParams.mockReturnValue({ id: 'r1' });
  postIdempotent.mockResolvedValue({});
  signInAs(makeUser([...ALL, 'pagos:ver', 'pagos:crear', 'pagos:editar'], ['reparaciones', 'pagos']));
});

describe('RepairDetailScreen', () => {
  it('muestra carga y luego el resumen de la orden', async () => {
    routeApi();
    const view = render(withQuery(<RepairDetailScreen />));
    expect(view.queryAll((n) => n.type === 'ActivityIndicator')).toHaveLength(1);
    await waitFor(() => view.getByText('OR-0001'));
    expect(view.text()).toContain('Cliente: Carlos');
    expect(view.text()).toContain('Equipo: 356000');
  });

  it('muestra el error y reintenta', async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(404, 'Orden no encontrada'));
    routeApi();
    apiFetch.mockRejectedValueOnce(new ApiError(404, 'Orden no encontrada'));
    const view = render(withQuery(<RepairDetailScreen />));
    await waitFor(() => view.getByText('Orden no encontrada'));
    view.press('Reintentar');
    await waitFor(() => view.getByText('OR-0001'));
  });

  it('cobros muestran montos es-CO y el abono envía el monto interpretado', async () => {
    routeApi();
    const view = render(withQuery(<RepairDetailScreen />));
    await waitFor(() => view.getByText('Cobros'));
    expect(view.text()).toContain('Total: $150.000 · Pagado: $50.000 · Saldo: $100.000');
    view.getByText('$50.000 · completado');

    expect(view.isDisabled('Registrar pago')).toBe(true);
    view.press('Método: Seleccionar');
    view.press('Efectivo');
    view.changeText({ placeholder: 'Monto' }, '25.000');
    view.press('Registrar pago');
    await waitFor(() =>
      expect(postIdempotent).toHaveBeenCalledWith('reparaciones/r1/pagos', { monto: 25000, metodoPagoId: 'efectivo' }, expect.any(String)),
    );
  });

  it('sin permiso de pagos no muestra la sección', async () => {
    signInAs(makeUser(ALL, ['reparaciones']));
    routeApi();
    const view = render(withQuery(<RepairDetailScreen />));
    await waitFor(() => view.getByText('OR-0001'));
    expect(view.queryByText('Cobros')).toBeNull();
  });

  it('entregar pide confirmación antes de cambiar el estado', async () => {
    routeApi();
    const view = render(withQuery(<RepairDetailScreen />));
    await waitFor(() => view.getByText('DELIVERED'));
    view.press('DELIVERED');
    expect(apiFetch).not.toHaveBeenCalledWith('reparaciones/r1/estado', expect.anything());
    const buttons = vi.mocked(Alert.alert).mock.calls[0][2]!;
    buttons[1].onPress!();
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('reparaciones/r1/estado', { method: 'PUT', body: { status: 'DELIVERED' } }),
    );
  });

  it('sin permiso de entrega no ofrece la transición', async () => {
    signInAs(makeUser(['reparaciones:ver'], ['reparaciones']));
    routeApi();
    const view = render(withQuery(<RepairDetailScreen />));
    await waitFor(() => view.getByText('OR-0001'));
    expect(view.queryByText('DELIVERED')).toBeNull();
    expect(view.queryByText('Asignar')).toBeNull();
  });

  it('cotización aprobada bloquea el editor de borradores', async () => {
    signInAs(makeUser([...ALL, 'cotizaciones:crear'], ['reparaciones']));
    routeApi();
    const view = render(withQuery(<RepairDetailScreen />));
    await waitFor(() => view.getByText('Cotizaciones'));
    view.getByText('APPROVED · $150.000');
    expect(view.queryByText('Guardar borrador')).toBeNull();
  });
});
