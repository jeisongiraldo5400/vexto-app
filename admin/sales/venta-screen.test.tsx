import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/core/http/api-error';
import { createTestQueryClient, makeUser, signInAs, withQuery } from '@/test-utils/fixtures';
import { render, waitFor } from '@/test-utils/renderer';

import VentaScreen from './index';

const m = vi.hoisted(() => ({
  fetchAlmacenes: vi.fn(),
  fetchMetodosPago: vi.fn(),
  fetchStockProductoAlmacen: vi.fn(),
  crearVenta: vi.fn(),
  crearVentaCredito: vi.fn(),
  fetchProductoByCodigoBarras: vi.fn(),
  fetchClientesBusqueda: vi.fn(),
}));
vi.mock('@/admin/sales/adapters/sales.adapter', () => ({
  fetchAlmacenes: m.fetchAlmacenes,
  fetchMetodosPago: m.fetchMetodosPago,
  fetchStockProductoAlmacen: m.fetchStockProductoAlmacen,
  crearVenta: m.crearVenta,
}));
vi.mock('@/admin/sales/adapters/credito.adapter', async (orig) => ({
  ...(await orig<typeof import('@/admin/sales/adapters/credito.adapter')>()),
  crearVentaCredito: m.crearVentaCredito,
}));
vi.mock('@/admin/products/adapters/products.adapter', () => ({ fetchProductoByCodigoBarras: m.fetchProductoByCodigoBarras }));
vi.mock('@/admin/sales/adapters/clientes.adapter', () => ({ fetchClientesBusqueda: m.fetchClientesBusqueda, crearCliente: vi.fn() }));
vi.mock('@/hooks/use-debounced-value', () => ({ useDebouncedValue: <T,>(v: T) => v }));

const producto = { id: 'p1', codigo: 'C1', codigoBarras: '770', nombre: 'Cargador', precioVenta: 25000, unidadMedidaId: 'u', estado: 'activo' };

beforeEach(() => {
  vi.resetAllMocks();
  signInAs(makeUser(['pos:crear'], ['pos']));
  m.fetchAlmacenes.mockResolvedValue([
    { id: 'a2', codigo: 'B', nombre: 'Bodega B', activo: true },
    { id: 'a1', codigo: 'A', nombre: 'Bodega A', activo: true },
    { id: 'a0', codigo: '0', nombre: 'Cerrada', activo: false },
  ]);
  m.fetchMetodosPago.mockResolvedValue([
    { id: 'cash', nombre: 'Efectivo', codigo: 'efectivo', estado: 'activo' },
    { id: 'nequi', nombre: 'Nequi', codigo: 'nequi', estado: 'activo' },
  ]);
  m.fetchStockProductoAlmacen.mockResolvedValue({ cantidadDisponible: 5 });
  m.fetchProductoByCodigoBarras.mockResolvedValue(producto);
  m.fetchClientesBusqueda.mockResolvedValue({ clientes: [], total: 0 });
});

async function setup() {
  const client = createTestQueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const view = render(withQuery(<VentaScreen />, client));
  expect(view.text()).toContain('Cargando…');
  await waitFor(() => view.getByText('Carrito'));
  return { view, invalidate };
}

async function addProduct(view: Awaited<ReturnType<typeof setup>>['view'], qty: string) {
  view.press('Escanear');
  const cam = view.queryAll((n) => n.type === 'CameraView')[0];
  view.fire(cam, 'onBarcodeScanned', { data: '770' });
  await waitFor(() => view.getByText('Disponible: 5 unid.'));
  for (const d of qty) view.press(view.getByProps({ accessibilityLabel: `Número ${d}` }));
  view.press(view.getByProps({ accessibilityLabel: 'Agregar al carrito' }));
}

describe('VentaScreen', () => {
  it('carga metadatos, elige el almacén activo predeterminado y muestra carrito vacío', async () => {
    const { view } = await setup();
    expect(view.text()).toContain('Sin productos aún');
    expect(view.text()).toContain('Bodega A');
    expect(view.queryByText('Cerrada')).toBeNull();
  });

  it('avisa si fallan los metadatos', async () => {
    m.fetchMetodosPago.mockRejectedValue(new ApiError(500, 'x'));
    const { view } = await setup();
    expect(view.text()).toContain('No se pudieron cargar almacén o métodos de pago');
  });

  it('no abre el cobro con el carrito vacío', async () => {
    const { view } = await setup();
    view.press('Cobrar venta');
    expect(view.text()).toContain('Agrega al menos un producto al carrito.');
    expect(view.queryByText('Confirmar cobro')).toBeNull();
  });

  it('producto no encontrado muestra aviso en el escáner', async () => {
    m.fetchProductoByCodigoBarras.mockRejectedValue(new ApiError(404, 'no'));
    const { view } = await setup();
    view.press('Escanear');
    view.fire(view.queryAll((n) => n.type === 'CameraView')[0], 'onBarcodeScanned', { data: '999' });
    await waitFor(() => view.getByText('Producto no encontrado. Revisa el código o el catálogo.'));
  });

  it('escanea, cobra en efectivo y envía el payload correcto', async () => {
    m.crearVenta.mockResolvedValue({ id: 'v1', numeroFactura: 'F-1', total: 50000, items: [] });
    const { view, invalidate } = await setup();
    await addProduct(view, '2');
    expect(view.text()).toContain('$25.000 c/u · $50.000');
    expect(view.text()).toContain('Disponible: 5');
    expect(m.fetchStockProductoAlmacen).toHaveBeenCalledWith('p1', 'a1');

    view.press('Cobrar venta');
    const recibido = view.queryAll((n) => n.type === 'TextInput')[1];
    view.changeText(recibido, '100.000');
    view.press('Confirmar cobro');
    await waitFor(() => view.getByText('Factura F-1'));
    expect(m.crearVenta).toHaveBeenCalledWith(
      {
        almacenId: 'a1',
        metodoPagoId: 'cash',
        pagos: [{ metodoPagoId: 'cash', monto: 50000, montoRecibido: 100000 }],
        items: [{ productoId: 'p1', cantidad: 2 }],
      },
      expect.any(String),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['stock'] });
    view.press('Nueva venta');
    expect(view.text()).toContain('Sin productos aún');
  });

  it('un error de la API se muestra y el reintento conserva la intención', async () => {
    m.crearVenta
      .mockRejectedValueOnce(new ApiError(0, 'Sin conexión'))
      .mockResolvedValue({ id: 'v1', numeroFactura: 'F-2', total: 25000, items: [] });
    const { view } = await setup();
    await addProduct(view, '1');
    view.press('Cobrar venta');
    view.press('Efectivo'); // quita efectivo
    view.press('Nequi'); // primer método: toma el total
    view.press('Confirmar cobro');
    await waitFor(() => view.getByText('Sin conexión'));
    expect(view.text()).toContain('Confirmar cobro'); // el modal sigue abierto
    view.press('Confirmar cobro');
    await waitFor(() => view.getByText('Factura F-2'));
    expect(m.crearVenta.mock.calls[0][0].pagos).toEqual([{ metodoPagoId: 'nequi', monto: 25000 }]);
    expect(m.crearVenta.mock.calls[1][1]).toBe(m.crearVenta.mock.calls[0][1]);
  });

  it('la cantidad del carrito no supera el stock', async () => {
    const { view } = await setup();
    await addProduct(view, '5');
    expect(view.text()).toContain('Máx. disponible: 5');
    expect(view.isDisabled(view.getByProps({ accessibilityLabel: 'Stock máximo alcanzado' }))).toBe(true);
    view.press('−');
    expect(view.getByProps({ accessibilityLabel: 'Aumentar cantidad' })).toBeTruthy();
  });

  it('venta a crédito envía el payload con cliente y cronograma', async () => {
    m.fetchClientesBusqueda.mockResolvedValue({
      clientes: [{ id: 'c1', tipoDocumento: 'CC', numeroDocumento: '1', nombre: 'Ana', apellido: null, razonSocial: null, telefono: null }],
      total: 1,
    });
    m.crearVentaCredito.mockResolvedValue({ ventaId: 'v9', numeroFactura: 'F-9', total: 50000, credito: { id: 'k', saldoPendiente: 50000 } });
    const { view } = await setup();
    await addProduct(view, '2');
    view.press('Vender a crédito');
    view.changeText(view.queryAll((n) => n.type === 'TextInput' && n.props.placeholder === 'Buscar cliente…').at(-1)!, 'Ana');
    await waitFor(() => view.getByText('Ana · CC 1'));
    view.press(view.queryAllByText('Ana · CC 1').at(-1)!);
    view.press('Confirmar crédito');
    await waitFor(() => view.getByText('Factura F-9'));
    expect(m.crearVentaCredito).toHaveBeenCalledWith(
      {
        almacenId: 'a1',
        clienteId: 'c1',
        items: [{ productoId: 'p1', cantidad: 2 }],
        cuotaInicial: 0,
        numeroCuotas: 3,
        frecuenciaDias: 30,
      },
      expect.any(String),
    );
  });
});
