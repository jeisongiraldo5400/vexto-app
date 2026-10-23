import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/core/http/api-error';
import { makeUser, signInAs, withQuery } from '@/test-utils/fixtures';
import { router } from '@/test-utils/expo-router';
import { render, waitFor } from '@/test-utils/renderer';

import { RepairIntakeScreen } from './repair-intake-screen';

const { apiFetch, postIdempotent } = vi.hoisted(() => ({ apiFetch: vi.fn(), postIdempotent: vi.fn() }));
vi.mock('@/core/http/api', () => ({ apiFetch }));
vi.mock('@/core/http/idempotent', async (orig) => ({
  ...(await orig<typeof import('@/core/http/idempotent')>()),
  postIdempotent,
}));
vi.mock('@/admin/sales/components/nuevo-cliente-modal', () => ({ NuevoClienteModal: () => null }));

const resources = {
  clientes: [
    { id: 'c1', nombre: 'Carlos', numero_documento: '1' },
    { id: 'c2', nombre: 'Diana', numero_documento: '2' },
  ],
  equipos: [
    { id: 'd1', customer_id: 'c1', imei: '111' },
    { id: 'd2', customer_id: 'c2', serial_number: 'SN-2' },
  ],
  tipos: [{ id: 'tp1', nombre: 'Celular' }],
  tecnicos: [],
  productos: [],
  almacenes: [],
  metodos: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(makeUser(['reparaciones:crear'], ['reparaciones']));
  apiFetch.mockImplementation(async (path: string) => (path === 'reparaciones/catalogos/operacion' ? resources : { id: 'd9' }));
});

describe('RepairIntakeScreen', () => {
  it('carga catálogos y filtra equipos por cliente', async () => {
    const view = render(withQuery(<RepairIntakeScreen />));
    expect(view.queryAll((n) => n.type === 'ActivityIndicator')).toHaveLength(1);
    await waitFor(() => view.getByText('Cliente: Seleccionar'));
    view.press('Cliente: Seleccionar');
    view.press('Carlos');
    view.press('Equipo: Seleccionar');
    expect(view.queryByText('111')).not.toBeNull();
    expect(view.queryByText('SN-2')).toBeNull();
  });

  it('exige cliente, equipo y problema; luego envía la orden y navega', async () => {
    postIdempotent.mockResolvedValue({ id: 'r77' });
    const view = render(withQuery(<RepairIntakeScreen />));
    await waitFor(() => view.getByText('Cliente: Seleccionar'));
    const submit = () => view.queryAll((n) => n.type === 'Text' && n.children[0] === 'Recibir equipo').at(-1)!;
    expect(view.isDisabled(submit())).toBe(true);

    view.press('Cliente: Seleccionar');
    view.press('Carlos');
    view.press('Equipo: Seleccionar');
    view.press('111');
    expect(view.isDisabled(submit())).toBe(true);
    view.changeText({ placeholder: 'Problema reportado' }, 'Pantalla rota');
    view.press('Carcasa: No probado');
    view.press('Dañado');
    view.press(submit());

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/(app)/reparacion/r77'));
    expect(postIdempotent).toHaveBeenCalledWith('reparaciones', {
      customerId: 'c1',
      deviceId: 'd1',
      reportedIssue: 'Pantalla rota',
      priority: 'NORMAL',
      checklist: [
        { label: 'Carcasa', result: 'DAMAGED' },
        { label: 'Encendido', result: 'NOT_TESTED' },
        { label: 'Puertos', result: 'NOT_TESTED' },
        { label: 'Accesorios', result: 'NOT_TESTED' },
      ],
    });
  });

  it('cambiar de cliente limpia el equipo elegido', async () => {
    const view = render(withQuery(<RepairIntakeScreen />));
    await waitFor(() => view.getByText('Cliente: Seleccionar'));
    view.press('Cliente: Seleccionar');
    view.press('Carlos');
    view.press('Equipo: Seleccionar');
    view.press('111');
    view.getByText('Equipo: 111');
    view.press('Cliente: Carlos');
    view.press('Diana');
    view.getByText('Equipo: Seleccionar');
  });

  it('muestra error de guardado sin navegar', async () => {
    postIdempotent.mockRejectedValue(new ApiError(400, 'Equipo inválido'));
    const view = render(withQuery(<RepairIntakeScreen />));
    await waitFor(() => view.getByText('Cliente: Seleccionar'));
    view.press('Cliente: Seleccionar');
    view.press('Carlos');
    view.press('Equipo: Seleccionar');
    view.press('111');
    view.changeText({ placeholder: 'Problema reportado' }, 'x');
    view.press(view.queryAll((n) => n.type === 'Text' && n.children[0] === 'Recibir equipo').at(-1)!);
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('No se pudo recibir', 'Equipo inválido'));
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('registra un equipo nuevo cuando tiene permiso', async () => {
    signInAs(makeUser(['reparaciones:crear', 'equipos:crear'], ['reparaciones']));
    const view = render(withQuery(<RepairIntakeScreen />));
    await waitFor(() => view.getByText('Cliente: Seleccionar'));
    view.press('Cliente: Seleccionar');
    view.press('Diana');
    view.press('Tipo para equipo nuevo: Seleccionar');
    view.press('Celular');
    view.changeText({ placeholder: 'IMEI / serial' }, '999');
    view.press('Registrar equipo');
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('equipos', {
        method: 'POST',
        body: { customerId: 'c2', deviceTypeId: 'tp1', serialNumber: '999' },
      }),
    );
  });

  it('error de catálogos ofrece reintento', async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(500, 'x'));
    const view = render(withQuery(<RepairIntakeScreen />));
    await waitFor(() => view.getByText('No se cargaron catálogos. Reintentar'));
    view.press('No se cargaron catálogos. Reintentar');
    await waitFor(() => expect(view.queryByText('No se cargaron catálogos. Reintentar')).toBeNull());
  });
});
