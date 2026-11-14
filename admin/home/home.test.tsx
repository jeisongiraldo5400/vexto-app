import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/core/http/api-error';
import { router } from '@/test-utils/expo-router';
import { makeUser, signInAs, withQuery } from '@/test-utils/fixtures';
import { render, waitFor } from '@/test-utils/renderer';

import type { DashboardData } from './adapters/home.adapter';
import { homeQueryKeys } from './hooks/query-keys';
import InicioScreen from './index';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('@/core/http/api', async () => ({ ...(await import('@/core/http/api-error')), apiFetch }));

const reportes = () => makeUser(['dashboard:ver'], ['reportes']);

const dashboard = (patch: Partial<DashboardData> = {}): DashboardData => ({
  ventasHoy: 1234567,
  ventasSemana: 2000000,
  ventasMes: 9500000.4,
  pagosHoy: 50000,
  productosBajoStock: 1200,
  totalClientes: 3,
  ventasPorPeriodo: [
    { fecha: '2026-10-08', totalVentas: 1, montoTotal: 15000, cantidadProductos: 1 },
    { fecha: '2026-10-09', totalVentas: 4, montoTotal: 80000, cantidadProductos: 6 },
  ],
  productosMasVendidos: [
    { productoId: 'p1', productoNombre: 'Cerveza', productoCodigo: 'C-1', cantidadVendida: 40, montoTotal: 140000 },
  ],
  ...patch,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('home adapter y query keys', () => {
  it('consulta el dashboard de reportes', async () => {
    const { fetchDashboard } = await import('./adapters/home.adapter');
    apiFetch.mockResolvedValue(dashboard());
    await fetchDashboard();
    expect(apiFetch).toHaveBeenCalledWith('/reportes/dashboard');
  });
  it('las claves del dashboard comparten el prefijo que invalida una venta', () => {
    expect(homeQueryKeys.dashboard('e1').slice(0, 1)).toEqual(homeQueryKeys.all);
  });
});

describe('InicioScreen', () => {
  it('sin permiso de reportes muestra accesos rápidos según permisos, sin consultar el dashboard', () => {
    signInAs(makeUser(['reparaciones:ver'], ['reparaciones']));
    const view = render(withQuery(<InicioScreen />));
    expect(view.text()).toContain('Bienvenido de nuevo');
    expect(view.queryByText('Nueva venta')).toBeNull();
    view.press('Mis reparaciones');
    expect(router.push).toHaveBeenCalledWith('/(app)/(tabs)/reparaciones');
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('operador con POS ve "Nueva venta"', () => {
    signInAs(makeUser(['pos:crear'], ['pos']));
    const view = render(withQuery(<InicioScreen />));
    expect(view.queryByText('Mis reparaciones')).toBeNull();
    view.press('Nueva venta');
    expect(router.push).toHaveBeenCalledWith('/(app)/(tabs)/venta');
  });

  it('muestra carga y luego el resumen con montos es-CO y días ordenados', async () => {
    signInAs(reportes());
    let resolve!: (d: DashboardData) => void;
    apiFetch.mockReturnValue(new Promise((r) => (resolve = r)));
    const view = render(withQuery(<InicioScreen />));
    view.getByText('Cargando resumen…');

    resolve(dashboard());
    await waitFor(() => view.getByText('$1.234.567'));
    expect(view.text()).toContain('Ana');
    expect(view.getByText('$9.500.000')).toBeTruthy();
    expect(view.getByText('1.200')).toBeTruthy();
    expect(view.text()).toContain('Cerveza');
    expect(view.queryAllByText(/^\d{2}\/\d{2}\/\d{4}$/)).toHaveLength(2);
    // 09/10 antes que 08/10 (descendente).
    expect(view.text().indexOf('09/10/2026')).toBeLessThan(view.text().indexOf('08/10/2026'));
    expect(view.queryByText('Aún no hay ventas registradas para mostrar.')).toBeNull();
  });

  it('muestra el estado vacío cuando no hay ventas', async () => {
    signInAs(reportes());
    apiFetch.mockResolvedValue(dashboard({ ventasPorPeriodo: [], productosMasVendidos: [] }));
    const view = render(withQuery(<InicioScreen />));
    await waitFor(() => view.getByText('Aún no hay ventas registradas para mostrar.'));
  });

  it('tolera un dashboard sin listas (respuesta parcial del API)', async () => {
    signInAs(reportes());
    const partial = dashboard();
    delete (partial as Partial<DashboardData>).productosMasVendidos;
    delete (partial as Partial<DashboardData>).ventasPorPeriodo;
    apiFetch.mockResolvedValue(partial);
    const view = render(withQuery(<InicioScreen />));
    await waitFor(() => view.getByText('Aún no hay ventas registradas para mostrar.'));
    expect(view.getByText('$1.234.567')).toBeTruthy();
  });

  it('403 explica el permiso faltante', async () => {
    signInAs(reportes());
    apiFetch.mockRejectedValue(new ApiError(403, 'Forbidden'));
    const view = render(withQuery(<InicioScreen />));
    await waitFor(() => view.getByText(/Sin permiso para ver el dashboard/), 4000);
  });

  it('500 muestra el mensaje del servidor y "Error" genérico se reemplaza', async () => {
    signInAs(reportes());
    apiFetch.mockRejectedValue(new ApiError(500, 'Error'));
    const view = render(withQuery(<InicioScreen />));
    await waitFor(
      () => view.getByText('No se pudo cargar el resumen. Reintenta o contacta al administrador.'),
      4000,
    );
    view.getByText('Toca para reintentar');
  });
});
