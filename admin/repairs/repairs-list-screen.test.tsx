import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/core/http/api-error';
import { makeUser, signInAs, withQuery } from '@/test-utils/fixtures';
import { router } from '@/test-utils/expo-router';
import { render, waitFor } from '@/test-utils/renderer';

import { RepairsListScreen } from './repairs-list-screen';

const { fetchRepairs } = vi.hoisted(() => ({ fetchRepairs: vi.fn() }));
vi.mock('@/admin/repairs/adapters', () => ({ fetchRepairs }));
// El modal de escaneo se prueba aparte; aquí se expone su `onCode`.
const scanner = vi.hoisted(() => ({ onCode: null as null | ((code: string) => Promise<void>) }));
vi.mock('@/admin/sales/components/barcode-scanner-modal', () => ({
  BarcodeScannerModal: (p: { feedback: string | null; onCode: (code: string) => Promise<void> }) => {
    scanner.onCode = p.onCode;
    return p.feedback;
  },
}));
vi.mock('@/hooks/use-debounced-value', () => ({ useDebouncedValue: <T,>(v: T) => v }));

const order = (id: string, status = 'RECEIVED') => ({
  id,
  orderNumber: `OR-${id}`,
  status,
  priority: 'NORMAL',
  reportedIssue: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(makeUser(['reparaciones:ver'], ['reparaciones']));
});

describe('RepairsListScreen', () => {
  it('muestra carga y luego las órdenes con su estado traducido', async () => {
    let resolve!: (v: unknown) => void;
    fetchRepairs.mockReturnValue(new Promise((r) => (resolve = r)));
    const view = render(withQuery(<RepairsListScreen />));
    expect(view.queryAll((n) => n.type === 'ActivityIndicator')).toHaveLength(1);
    expect(view.queryByText('No tienes órdenes asignadas.')).toBeNull();

    resolve({ items: [order('1', 'IN_REPAIR')], total: 1 });
    await waitFor(() => view.getByText('OR-1'));
    expect(view.text()).toContain('En reparación · NORMAL');
    expect(view.text()).toContain('Sin problema reportado');
    expect(fetchRepairs).toHaveBeenCalledWith('', 1, true);

    view.press('OR-1');
    expect(router.push).toHaveBeenCalledWith('/(app)/reparacion/1');
  });

  it('muestra estado vacío', async () => {
    fetchRepairs.mockResolvedValue({ items: [], total: 0 });
    const view = render(withQuery(<RepairsListScreen />));
    await waitFor(() => view.getByText('No tienes órdenes asignadas.'));
    expect(view.isDisabled('Siguiente')).toBe(true);
  });

  it('muestra el error y permite reintentar', async () => {
    fetchRepairs.mockRejectedValueOnce(new ApiError(500, 'Servidor caído'));
    const view = render(withQuery(<RepairsListScreen />));
    await waitFor(() => view.getByText('Servidor caído'));
    expect(view.queryByText('No tienes órdenes asignadas.')).toBeNull();

    fetchRepairs.mockResolvedValue({ items: [order('2')], total: 1 });
    view.press('Reintentar');
    await waitFor(() => view.getByText('OR-2'));
  });

  it('oculta acciones sin permiso y las muestra con permiso', async () => {
    fetchRepairs.mockResolvedValue({ items: [], total: 0 });
    const view = render(withQuery(<RepairsListScreen />));
    await waitFor(() => view.getByText('No tienes órdenes asignadas.'));
    expect(view.queryByText('Recibir equipo')).toBeNull();
    expect(view.queryByText('Ver todas las órdenes')).toBeNull();
    view.unmount();

    signInAs(makeUser(['reparaciones:ver', 'reparaciones:crear', 'reparaciones:ver-todas'], ['reparaciones']));
    const admin = render(withQuery(<RepairsListScreen />));
    admin.press('Recibir equipo');
    expect(router.push).toHaveBeenCalledWith('/(app)/reparacion/nueva');
    admin.press('Ver todas las órdenes');
    await waitFor(() => expect(fetchRepairs).toHaveBeenCalledWith('', 1, false));
    admin.getByText('Ver mis órdenes');
  });

  it('pagina de 50 en 50 y reinicia la página al buscar', async () => {
    fetchRepairs.mockResolvedValue({ items: [order('1')], total: 120 });
    const view = render(withQuery(<RepairsListScreen />));
    await waitFor(() => view.getByText('1 · 120 órdenes'));
    expect(view.isDisabled('Anterior')).toBe(true);
    view.press('Siguiente');
    await waitFor(() => expect(fetchRepairs).toHaveBeenLastCalledWith('', 2, true));
    view.changeText({ placeholder: 'Buscar por número' }, 'OR-9');
    await waitFor(() => expect(fetchRepairs).toHaveBeenLastCalledWith('OR-9', 1, true));
  });

  it('el escáner abre la orden única encontrada', async () => {
    fetchRepairs.mockResolvedValue({ items: [], total: 0 });
    const view = render(withQuery(<RepairsListScreen />));
    await waitFor(() => view.getByText('No tienes órdenes asignadas.'));
    fetchRepairs.mockImplementation(async (q: string) => ({ items: q === 'IMEI-7' ? [order('7')] : [], total: 0 }));
    await scanner.onCode!('IMEI-7');
    expect(router.push).toHaveBeenCalledWith('/(app)/reparacion/7');
  });

  it('el escáner informa un fallo de red sin sobrescribirlo con "no encontrada"', async () => {
    fetchRepairs.mockResolvedValue({ items: [], total: 0 });
    const view = render(withQuery(<RepairsListScreen />));
    await waitFor(() => view.getByText('No tienes órdenes asignadas.'));
    fetchRepairs.mockRejectedValue(new ApiError(0, 'Network Error'));
    await scanner.onCode!('IMEI-1');
    expect(view.text()).toContain('No se pudo consultar. Revisa la conexión o permisos.');
    expect(view.text()).not.toContain('No se encontró una orden con ese código');
  });

  it('el escáner informa cuando no hay coincidencias', async () => {
    fetchRepairs.mockResolvedValue({ items: [], total: 0 });
    const view = render(withQuery(<RepairsListScreen />));
    await scanner.onCode!('NADA');
    expect(view.text()).toContain('No se encontró una orden con ese código');
  });
});
