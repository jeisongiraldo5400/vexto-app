import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/core/http/api-error';
import { createTestQueryClient, makeUser, signInAs, withQuery } from '@/test-utils/fixtures';
import { renderHook, waitFor } from '@/test-utils/renderer';
import type { ReactNode } from 'react';

import { useAlmacenesQuery } from './use-almacenes-query';
import { useClientesBusquedaQuery } from './use-clientes-busqueda-query';
import { useCrearClienteMutation } from './use-crear-cliente-mutation';
import { useCreateCreditoVentaMutation } from './use-create-credito-venta-mutation';
import { useCreateVentaMutation } from './use-create-venta-mutation';
import { useResolveProductoBarcodeMutation } from './use-resolve-producto-barcode-mutation';
import { useStockProductoQuery } from './use-stock-producto-query';

const m = vi.hoisted(() => ({
  crearVenta: vi.fn(),
  crearVentaCredito: vi.fn(),
  fetchAlmacenes: vi.fn(),
  fetchStockProductoAlmacen: vi.fn(),
  fetchClientesBusqueda: vi.fn(),
  crearCliente: vi.fn(),
  fetchProductoByCodigoBarras: vi.fn(),
}));
vi.mock('@/admin/sales/adapters/sales.adapter', () => ({
  crearVenta: m.crearVenta,
  fetchAlmacenes: m.fetchAlmacenes,
  fetchStockProductoAlmacen: m.fetchStockProductoAlmacen,
}));
vi.mock('@/admin/sales/adapters/credito.adapter', () => ({ crearVentaCredito: m.crearVentaCredito }));
vi.mock('@/admin/sales/adapters/clientes.adapter', () => ({
  fetchClientesBusqueda: m.fetchClientesBusqueda,
  crearCliente: m.crearCliente,
}));
vi.mock('@/admin/products/adapters/products.adapter', () => ({
  fetchProductoByCodigoBarras: m.fetchProductoByCodigoBarras,
}));

const venta = { almacenId: 'a', items: [{ productoId: 'p', cantidad: 1 }], pagos: [] };
const credito = { ...venta, clienteId: 'c', cuotaInicial: 0, numeroCuotas: 3, frecuenciaDias: 30 };

beforeEach(() => {
  vi.resetAllMocks();
  signInAs(makeUser(['pos:crear'], ['pos']));
});

const wrap = (client = createTestQueryClient()) => (node: ReactNode) => withQuery(node, client);

describe.each([
  ['useCreateVentaMutation', useCreateVentaMutation, m.crearVenta, venta],
  ['useCreateCreditoVentaMutation', useCreateCreditoVentaMutation, m.crearVentaCredito, credito],
] as const)('%s', (_name, useHook, adapter, body) => {
  const intentOf = (call: number) => adapter.mock.calls[call][1] as string;

  it('reutiliza la intención al reintentar tras un fallo y la renueva tras el éxito', async () => {
    adapter.mockRejectedValueOnce(new ApiError(0, 'Red')).mockResolvedValue({ id: 'v' });
    const { result } = renderHook(() => useHook(), wrap());
    await expect(result.current.mutateAsync(body as never)).rejects.toThrow('Red');
    await result.current.mutateAsync(body as never);
    await result.current.mutateAsync(body as never);
    expect(intentOf(0)).toEqual(expect.any(String));
    expect(intentOf(1)).toBe(intentOf(0));
    expect(intentOf(2)).not.toBe(intentOf(1));
    expect(adapter.mock.calls[0][0]).toEqual(body);
  });

  it('cada pantalla (instancia) tiene su propia intención', async () => {
    adapter.mockResolvedValue({ id: 'v' });
    const a = renderHook(() => useHook(), wrap());
    const b = renderHook(() => useHook(), wrap());
    await a.result.current.mutateAsync(body as never).catch(() => {});
    await b.result.current.mutateAsync(body as never);
    expect(intentOf(0)).not.toBe(intentOf(1));
  });
});

describe('consultas del POS', () => {
  it('no consulta almacenes sin sesión lista', async () => {
    signInAs(makeUser([], []), { needsCompanyPick: true });
    m.fetchAlmacenes.mockResolvedValue([]);
    const { result } = renderHook(() => useAlmacenesQuery(), wrap());
    await new Promise((r) => setTimeout(r, 20));
    expect(m.fetchAlmacenes).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('consulta almacenes con sesión', async () => {
    m.fetchAlmacenes.mockResolvedValue([{ id: 'a' }]);
    const { result } = renderHook(() => useAlmacenesQuery(), wrap());
    await waitFor(() => expect(result.current.data).toEqual([{ id: 'a' }]));
  });

  it('la búsqueda de clientes espera 2 caracteres y recorta', async () => {
    m.fetchClientesBusqueda.mockResolvedValue({ clientes: [], total: 0 });
    const short = renderHook(() => useClientesBusquedaQuery(' a '), wrap());
    await new Promise((r) => setTimeout(r, 20));
    expect(m.fetchClientesBusqueda).not.toHaveBeenCalled();
    short.unmount();
    renderHook(() => useClientesBusquedaQuery('  an '), wrap());
    await waitFor(() => expect(m.fetchClientesBusqueda).toHaveBeenCalledWith('an'));
  });

  it('el stock solo se consulta con producto y almacén', async () => {
    m.fetchStockProductoAlmacen.mockResolvedValue({ cantidadDisponible: 4 });
    renderHook(() => useStockProductoQuery(null, 'a'), wrap());
    await new Promise((r) => setTimeout(r, 20));
    expect(m.fetchStockProductoAlmacen).not.toHaveBeenCalled();
    const { result } = renderHook(() => useStockProductoQuery('p', 'a'), wrap());
    await waitFor(() => expect(result.current.data).toEqual({ cantidadDisponible: 4 }));
    expect(m.fetchStockProductoAlmacen).toHaveBeenCalledWith('p', 'a');
  });

  it('crear cliente invalida las búsquedas de clientes', async () => {
    const client = createTestQueryClient();
    const spy = vi.spyOn(client, 'invalidateQueries');
    m.crearCliente.mockResolvedValue({ id: 'c1' });
    const { result } = renderHook(() => useCrearClienteMutation(), wrap(client));
    await result.current.mutateAsync({ tipoDocumento: 'CC', numeroDocumento: '1', nombre: 'Ana' });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['clientes'] });
  });

  it('el código de barras se recorta y el vacío se rechaza sin red', async () => {
    m.fetchProductoByCodigoBarras.mockResolvedValue({ id: 'p' });
    const { result } = renderHook(() => useResolveProductoBarcodeMutation(), wrap());
    await expect(result.current.mutateAsync('   ')).rejects.toThrow('Código vacío');
    await result.current.mutateAsync(' 770123 ');
    expect(m.fetchProductoByCodigoBarras).toHaveBeenCalledTimes(1);
    expect(m.fetchProductoByCodigoBarras).toHaveBeenCalledWith('770123');
  });
});
