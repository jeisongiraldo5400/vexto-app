import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/core/http/api-error';
import type { Producto } from '@/core/types';
import { makeUser, signInAs, withQuery } from '@/test-utils/fixtures';
import { render, waitFor } from '@/test-utils/renderer';

import { fetchProductoByCodigoBarras, fetchProductosList } from './adapters/products.adapter';
import { productsQueryKeys } from './hooks/query-keys';
import ProductosScreen from './index';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('@/core/http/api', async () => ({ ...(await import('@/core/http/api-error')), apiFetch }));

const producto = (id: string, patch: Partial<Producto> = {}): Producto => ({
  id,
  codigo: `C-${id}`,
  codigoBarras: null,
  nombre: `Producto ${id}`,
  precioVenta: 3500,
  unidadMedidaId: 'u',
  estado: 'activo',
  ...patch,
});

/** Responde según la ruta pedida; cualquier ruta inesperada falla. */
function routeApi(routes: Record<string, (url: string) => unknown>) {
  apiFetch.mockImplementation(async (url: string) => {
    const key = Object.keys(routes).find((k) => url.startsWith(k));
    if (!key) throw new Error(`Ruta no mockeada: ${url}`);
    return routes[key](url);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  signInAs(makeUser(['productos:ver'], ['inventario']));
});

describe('products adapter', () => {
  it('recorre todas las páginas activas con la búsqueda recortada', async () => {
    apiFetch
      .mockResolvedValueOnce({ productos: [producto('1'), producto('2')], total: 3 })
      .mockResolvedValueOnce({ productos: [producto('3')], total: 3 });
    const res = await fetchProductosList('  cerveza ');
    expect(res.productos.map((p) => p.id)).toEqual(['1', '2', '3']);
    expect(res.total).toBe(3);
    const urls = apiFetch.mock.calls.map((c) => new URL(c[0], 'http://x'));
    expect(urls.map((u) => u.searchParams.get('pagina'))).toEqual(['1', '2']);
    expect(urls[0].searchParams.get('busqueda')).toBe('cerveza');
    expect(urls[0].searchParams.get('estado')).toBe('activo');
    expect(urls[0].searchParams.get('limite')).toBe('100');
  });

  it('se detiene ante una página vacía aunque el total no cuadre', async () => {
    apiFetch
      .mockResolvedValueOnce({ productos: [producto('1')], total: 10 })
      .mockResolvedValueOnce({ productos: [], total: 10 });
    const res = await fetchProductosList('');
    expect(res).toEqual({ productos: [producto('1')], total: 1 });
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });

  it('codifica el código de barras en la ruta', async () => {
    apiFetch.mockResolvedValue(producto('1'));
    await fetchProductoByCodigoBarras('77 01/2');
    expect(apiFetch).toHaveBeenCalledWith('/productos/codigo-barras/77%2001%2F2');
  });

  it('las claves de productos cuelgan del prefijo que invalida una venta', () => {
    expect(productsQueryKeys.productos('x')).toEqual(['productos', { busqueda: 'x' }]);
  });
});

describe('ProductosScreen', () => {
  it('muestra carga y luego productos con precio es-CO y stock del almacén único', async () => {
    let resolve!: (v: unknown) => void;
    routeApi({
      '/productos': () => new Promise((r) => (resolve = r)),
      '/almacenes': () => [{ id: 'a1', codigo: '01', nombre: 'Principal', activo: true }],
      '/stock/almacen/a1': () => ({
        stocks: [{ productoId: '1', cantidadDisponible: 1500 }],
        total: 1,
      }),
    });
    const view = render(withQuery(<ProductosScreen />));
    expect(view.queryAll((n) => n.type === 'ActivityIndicator')).toHaveLength(1);

    resolve({ productos: [producto('1', { precioVenta: 1234567 }), producto('2')], total: 2 });
    await waitFor(() => view.getByText('Producto 1'));
    expect(view.text()).toContain('2 productos');
    expect(view.getByText('$1.234.567')).toBeTruthy();
    await waitFor(() => view.getByText('1.500 unid.'));
    expect(view.getByText('Sin stock')).toBeTruthy();
    expect(view.text()).toContain('Almacén: Principal');
  });

  it('sin almacenes no muestra stock y lo indica', async () => {
    routeApi({
      '/productos': () => ({ productos: [producto('1')], total: 1 }),
      '/almacenes': () => [],
    });
    const view = render(withQuery(<ProductosScreen />));
    await waitFor(() => view.getByText('Producto 1'));
    expect(view.text()).toContain('1 producto  ·  Selecciona un almacén para ver stock');
    expect(view.queryByText('Sin stock')).toBeNull();
  });

  it('elige el almacén activo por código y permite cambiarlo', async () => {
    routeApi({
      '/productos': () => ({ productos: [producto('1')], total: 1 }),
      '/almacenes': () => [
        { id: 'b', codigo: '02', nombre: 'Bodega', activo: true },
        { id: 'a', codigo: '01', nombre: 'Tienda', activo: true },
        { id: 'x', codigo: '00', nombre: 'Cerrado', activo: false },
      ],
      '/stock/almacen/': () => ({ stocks: [], total: 0 }),
    });
    const view = render(withQuery(<ProductosScreen />));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(expect.stringMatching(/^\/stock\/almacen\/a\?/)));
    expect(view.queryByText('Cerrado')).toBeNull();
    view.press('Bodega');
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(expect.stringMatching(/^\/stock\/almacen\/b\?/)));
  });

  it('muestra vacío y error', async () => {
    routeApi({ '/productos': () => ({ productos: [], total: 0 }), '/almacenes': () => [] });
    const empty = render(withQuery(<ProductosScreen />));
    await waitFor(() => empty.getByText('0 productos  ·  Selecciona un almacén para ver stock'));
    empty.getByText('No hay resultados.');
    empty.unmount();

    routeApi({
      '/productos': () => {
        throw new ApiError(500, 'Catálogo no disponible');
      },
      '/almacenes': () => [],
    });
    const failed = render(withQuery(<ProductosScreen />));
    await waitFor(() => failed.getByText('Catálogo no disponible'));
    expect(failed.text()).not.toContain('0 productos');
  });

  it('busca con debounce y envía el texto al API', async () => {
    routeApi({
      '/productos': (url) => ({
        productos: url.includes('busqueda=arroz') ? [producto('9', { nombre: 'Arroz' })] : [],
        total: url.includes('busqueda=arroz') ? 1 : 0,
      }),
      '/almacenes': () => [],
    });
    const view = render(withQuery(<ProductosScreen />));
    view.changeText({ placeholder: 'Buscar por nombre o código' }, 'arroz');
    await waitFor(() => view.getByText('Arroz'));
  });
});
