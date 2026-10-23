import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { crearCliente, fetchClientesBusqueda } from './clientes.adapter';
import { crearVentaCredito, fetchDeudaCliente, previewCuotas } from './credito.adapter';
import {
  fetchAlmacenes,
  fetchMetodosPago,
  fetchStockAlmacen,
  fetchStockAlmacenAll,
  fetchStockProductoAlmacen,
} from './sales.adapter';

const { apiFetch, postIdempotent } = vi.hoisted(() => ({ apiFetch: vi.fn(), postIdempotent: vi.fn() }));
vi.mock('@/core/http/api', () => ({ apiFetch }));
vi.mock('@/core/http/idempotent', () => ({ postIdempotent }));

beforeEach(() => {
  vi.resetAllMocks();
  apiFetch.mockResolvedValue({});
});

describe('clientes.adapter', () => {
  it('busca clientes activos paginados y omite la búsqueda vacía', async () => {
    await fetchClientesBusqueda('   ');
    expect(apiFetch).toHaveBeenCalledWith('/clientes?pagina=1&limite=20&activo=true');
  });

  it('recorta y codifica la búsqueda', async () => {
    await fetchClientesBusqueda('  José & Cía ', 2, 5);
    const url = apiFetch.mock.calls[0][0] as string;
    const q = new URLSearchParams(url.split('?')[1]);
    expect(q.get('busqueda')).toBe('José & Cía');
    expect(q.get('pagina')).toBe('2');
    expect(q.get('limite')).toBe('5');
  });

  it('crea el cliente con POST', async () => {
    const body = { tipoDocumento: 'CC' as const, numeroDocumento: '1', nombre: 'Ana' };
    await crearCliente(body);
    expect(apiFetch).toHaveBeenCalledWith('/clientes', { method: 'POST', body });
  });
});

describe('sales.adapter', () => {
  it('construye las rutas de catálogo y stock', async () => {
    await fetchAlmacenes();
    await fetchMetodosPago();
    await fetchStockProductoAlmacen('p1', 'a1');
    expect(apiFetch.mock.calls.map((c) => c[0])).toEqual([
      '/almacenes',
      '/metodos-pago',
      '/stock/producto/p1/almacen/a1',
    ]);
  });

  it('fetchStockAlmacen incluye la búsqueda solo si hay texto', async () => {
    await fetchStockAlmacen('a1');
    await fetchStockAlmacen('a1', ' cable ', 3, 50);
    expect(apiFetch.mock.calls[0][0]).toBe('/stock/almacen/a1?pagina=1&limite=200');
    expect(apiFetch.mock.calls[1][0]).toBe('/stock/almacen/a1?pagina=3&limite=50&busqueda=cable');
  });

  it('fetchStockAlmacenAll recorre todas las páginas de 100', async () => {
    const stock = (n: number) => Array.from({ length: n }, (_, i) => ({ id: String(i) }));
    apiFetch
      .mockResolvedValueOnce({ stocks: stock(100), total: 230 })
      .mockResolvedValueOnce({ stocks: stock(100), total: 230 })
      .mockResolvedValueOnce({ stocks: stock(30), total: 230 });
    const all = await fetchStockAlmacenAll('a1');
    expect(all).toHaveLength(230);
    expect(apiFetch).toHaveBeenCalledTimes(3);
    expect(apiFetch.mock.calls[2][0]).toBe('/stock/almacen/a1?pagina=3&limite=100');
  });

  it('fetchStockAlmacenAll se detiene ante una página vacía (total inconsistente)', async () => {
    apiFetch
      .mockResolvedValueOnce({ stocks: [{ id: '1' }], total: 500 })
      .mockResolvedValueOnce({ stocks: [], total: 500 });
    expect(await fetchStockAlmacenAll('a1')).toHaveLength(1);
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });
});

describe('credito.adapter', () => {
  it('la venta a crédito es idempotente con la intención recibida', async () => {
    const body = {
      almacenId: 'a',
      clienteId: 'c',
      items: [{ productoId: 'p', cantidad: 1 }],
      cuotaInicial: 0,
      numeroCuotas: 3,
      frecuenciaDias: 30,
    };
    await crearVentaCredito(body, 'intent-1');
    expect(postIdempotent).toHaveBeenCalledWith('/creditos/ventas', body, 'intent-1');
  });

  it('consulta la deuda del cliente', async () => {
    await fetchDeudaCliente('c9');
    expect(apiFetch).toHaveBeenCalledWith('/creditos/cliente/c9/deuda');
  });

  describe('previewCuotas', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 0, 31, 10));
    });
    afterEach(() => vi.useRealTimers());

    it('reparte el saldo en cuotas y la última absorbe el redondeo', () => {
      const p = previewCuotas(100000, 0, 3, 30);
      expect(p.map((c) => c.monto)).toEqual([33333.33, 33333.33, 33333.34]);
      expect(p.reduce((s, c) => s + c.monto, 0)).toBeCloseTo(100000, 2);
      expect(p.map((c) => c.fecha)).toEqual(['2026-03-02', '2026-04-01', '2026-05-01']);
    });

    it('incluye la cuota inicial como cuota 0 con fecha de hoy', () => {
      const p = previewCuotas(150000, 50000, 2, 15);
      expect(p[0]).toEqual({ numero: 0, monto: 50000, fecha: '2026-01-31' });
      expect(p.slice(1).map((c) => c.monto)).toEqual([50000, 50000]);
      expect(p[1].fecha).toBe('2026-02-15');
    });

    it('sin saldo no genera cuotas adicionales', () => {
      expect(previewCuotas(1000, 1000, 3, 30)).toEqual([{ numero: 0, monto: 1000, fecha: '2026-01-31' }]);
      expect(previewCuotas(1000, 0, 0, 30)).toEqual([]);
    });
  });
});
