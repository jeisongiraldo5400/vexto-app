import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/core/http/api-error';
import { resumen, sesionAbierta } from '@/test-utils/caja-fixtures';
import { router } from '@/test-utils/expo-router';
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
  fetchCajaActual: vi.fn(),
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
vi.mock('@/admin/sales/adapters/clientes.adapter', () => ({ fetchClientesBusqueda: vi.fn(async () => ({ clientes: [], total: 0 })), crearCliente: vi.fn() }));
vi.mock('@/admin/cash-register/adapters', async (orig) => ({
  ...(await orig<typeof import('@/admin/cash-register/adapters')>()),
  fetchCajaActual: m.fetchCajaActual,
}));
vi.mock('@/hooks/use-debounced-value', () => ({ useDebouncedValue: <T,>(v: T) => v }));

const producto = { id: 'p1', codigo: 'C1', codigoBarras: '770', nombre: 'Cargador', precioVenta: 25000, unidadMedidaId: 'u', estado: 'activo' };
const cajaNoAbierta = new ApiError(409, 'Debes abrir tu caja antes de registrar cobros o reembolsos', { code: 'CAJA_NO_ABIERTA' });
const lastAlert = () => vi.mocked(Alert.alert).mock.calls.at(-1)!;

beforeEach(() => {
  vi.resetAllMocks();
  m.fetchAlmacenes.mockResolvedValue([{ id: 'a1', codigo: 'A', nombre: 'Bodega A', activo: true }]);
  // Método en efectivo con nombre y código distintos: solo `esEfectivo` lo identifica.
  m.fetchMetodosPago.mockResolvedValue([
    { id: 'caja', nombre: 'Caja menor', codigo: 'caja_menor', estado: 'activo', esEfectivo: true },
    { id: 'nequi', nombre: 'Nequi', codigo: 'nequi', estado: 'activo', esEfectivo: false },
  ]);
  m.fetchStockProductoAlmacen.mockResolvedValue({ cantidadDisponible: 5 });
  m.fetchProductoByCodigoBarras.mockResolvedValue(producto);
  m.fetchCajaActual.mockResolvedValue({ sesion: null, resumen: null });
});

async function setup() {
  const client = createTestQueryClient();
  const view = render(withQuery(<VentaScreen />, client));
  await waitFor(() => view.getByText('Carrito'));
  view.press('Escanear');
  view.fire(view.queryAll((n) => n.type === 'CameraView')[0], 'onBarcodeScanned', { data: '770' });
  await waitFor(() => view.getByText('Disponible: 5 unid.'));
  view.press(view.getByProps({ accessibilityLabel: 'Número 1' }));
  view.press(view.getByProps({ accessibilityLabel: 'Agregar al carrito' }));
  return view;
}

describe('POS con módulo caja', () => {
  it('sin caja abierta: indicador, bloquea el cobro y ofrece abrirla', async () => {
    signInAs(makeUser(['pos:crear', 'caja:abrir'], ['pos', 'caja']));
    const view = await setup();
    await waitFor(() => view.getByText('Caja cerrada · ábrela para poder cobrar'));
    view.press('Cobrar venta');
    expect(view.queryByText('Confirmar cobro')).toBeNull();
    expect(view.text()).toContain('Necesitas una caja abierta para registrar cobros o reembolsos.');
    expect(lastAlert()[0]).toBe('Caja cerrada');
    lastAlert()[2]!.at(-1)!.onPress!();
    expect(router.push).toHaveBeenCalledWith('/(app)/caja');
    expect(m.crearVenta).not.toHaveBeenCalled();
  });

  it('con caja abierta cobra; el efectivo se detecta por esEfectivo y exige recibido', async () => {
    signInAs(makeUser(['pos:crear', 'caja:abrir'], ['pos', 'caja']));
    m.fetchCajaActual.mockResolvedValue({ sesion: sesionAbierta, resumen });
    m.crearVenta.mockResolvedValue({ id: 'v1', numeroFactura: 'F-1', total: 25000, items: [] });
    const view = await setup();
    await waitFor(() => view.getByText(/^Caja abierta · desde/));
    view.press('Cobrar venta');
    view.getByText('Recibido');
    view.press('Confirmar cobro');
    view.getByText('Indica el monto recibido en efectivo (≥ monto aplicado)');
    view.changeText(view.queryAll((n) => n.type === 'TextInput')[1], '30.000');
    view.getByText('Vuelto: $5.000');
    view.press('Confirmar cobro');
    await waitFor(() => view.getByText('Factura F-1'));
    expect(m.crearVenta.mock.calls[0][0].pagos).toEqual([{ metodoPagoId: 'caja', monto: 25000, montoRecibido: 30000 }]);
  });

  it('CAJA_NO_ABIERTA del backend (p. ej. la cerraron en otro equipo) cierra el cobro y avisa', async () => {
    signInAs(makeUser(['pos:crear', 'caja:abrir'], ['pos', 'caja']));
    m.fetchCajaActual.mockResolvedValue({ sesion: sesionAbierta, resumen });
    m.crearVenta.mockRejectedValue(cajaNoAbierta);
    const view = await setup();
    await waitFor(() => view.getByText(/^Caja abierta · desde/));
    view.press('Cobrar venta');
    view.press('Caja menor');
    view.press('Nequi');
    view.press('Confirmar cobro');
    await waitFor(() => expect(lastAlert()[0]).toBe('Caja cerrada'));
    expect(view.queryByText('Confirmar cobro')).toBeNull();
    expect(view.text()).toContain('Necesitas una caja abierta');
  });

  it('sin permisos de caja no consulta la sesión: decide el backend y se avisa igual', async () => {
    signInAs(makeUser(['pos:crear'], ['pos', 'caja']));
    m.crearVenta.mockRejectedValue(cajaNoAbierta);
    const view = await setup();
    expect(m.fetchCajaActual).not.toHaveBeenCalled();
    expect(view.queryByText(/^Caja (abierta|cerrada)/)).toBeNull();
    view.press('Cobrar venta');
    view.press('Caja menor');
    view.press('Nequi');
    view.press('Confirmar cobro');
    await waitFor(() => expect(lastAlert()[1]).toMatch(/no tiene permiso para abrir caja/));
  });

  it('venta a crédito con cuota inicial: CAJA_NO_ABIERTA usa el mismo aviso', async () => {
    signInAs(makeUser(['pos:crear', 'caja:abrir'], ['pos', 'caja']));
    m.crearVentaCredito.mockRejectedValue(cajaNoAbierta);
    const { fetchClientesBusqueda } = await import('@/admin/sales/adapters/clientes.adapter');
    vi.mocked(fetchClientesBusqueda).mockResolvedValue({
      clientes: [{ id: 'c1', tipoDocumento: 'CC', numeroDocumento: '1', nombre: 'Ana', apellido: null, razonSocial: null, telefono: null }],
      total: 1,
    } as never);
    const view = await setup();
    view.press('Vender a crédito');
    view.changeText(view.queryAll((n) => n.type === 'TextInput' && n.props.placeholder === 'Buscar cliente…').at(-1)!, 'Ana');
    await waitFor(() => view.getByText('Ana · CC 1'));
    view.press(view.queryAllByText('Ana · CC 1').at(-1)!);
    view.changeText({ placeholder: 'Primera cuota del cronograma (opcional)' }, '10.000');
    view.press('Caja menor'); // quita efectivo
    view.press('Nequi');
    view.press('Confirmar crédito');
    await waitFor(() => expect(lastAlert()[0]).toBe('Caja cerrada'));
    expect(m.crearVentaCredito.mock.calls[0][0]).toMatchObject({
      cuotaInicial: 10000,
      pagosCuotaInicial: [{ metodoPagoId: 'nequi', monto: 10000 }],
    });
    expect(view.queryByText('Confirmar crédito')).toBeNull();
  });
});

describe('POS sin módulo caja', () => {
  it('sin indicador, sin consulta de caja y el cobro abre como siempre', async () => {
    signInAs(makeUser(['pos:crear', 'caja:abrir'], ['pos']));
    const view = await setup();
    expect(m.fetchCajaActual).not.toHaveBeenCalled();
    expect(view.queryByText(/^Caja /)).toBeNull();
    view.press('Cobrar venta');
    view.getByText('Confirmar cobro');
  });
});
