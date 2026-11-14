import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/core/http/api-error';
import { toLocalYmd } from '@/core/utils/date';
import { router, useLocalSearchParams } from '@/test-utils/expo-router';
import { makeUser, signInAs, withQuery } from '@/test-utils/fixtures';
import { render, renderHook, waitFor } from '@/test-utils/renderer';

import {
  abonarSeparado,
  cancelarSeparado,
  esFechaRetiroValida,
  fechaRetiroPorDefecto,
  fetchSeparados,
} from './adapters';
import { useAbonoSeparadoForm, useCancelarSeparadoForm } from './hooks';
import { SeparadoCreateScreen } from './separado-create-screen';
import { SeparadoDetailScreen } from './separado-detail-screen';
import { SeparadosListScreen } from './separados-list-screen';
import { useSeparadoForm } from './use-separado-form';

const { apiFetch, postIdempotent } = vi.hoisted(() => ({ apiFetch: vi.fn(), postIdempotent: vi.fn() }));
vi.mock('@/core/http/api', () => ({ apiFetch }));
vi.mock('@/core/http/idempotent', async (orig) => ({
  ...(await orig<typeof import('@/core/http/idempotent')>()),
  postIdempotent,
}));

const separado = {
  id: 's1',
  numeroSeparado: 'SEP-0001',
  clienteId: 'c1',
  clienteNombre: 'Ana Pérez',
  almacenId: 'a1',
  almacenNombre: 'Principal',
  anticipo: '20000.00',
  total: '100000.00',
  saldoPendiente: '80000.00',
  estado: 'pendiente',
  fechaLimiteRetiro: '2026-11-30',
  observacionesCancelacion: null,
  items: [{ productoId: 'p1', productoNombre: 'Cable', cantidad: 2, precioUnitario: 50000, subtotal: 100000, impuesto: 19000, total: 119000 }],
};

const ALL = ['separados:ver', 'separados:crear', 'separados:editar', 'separados:eliminar'];
const lastAlertButtons = () => vi.mocked(Alert.alert).mock.calls.at(-1)![2]!;

beforeEach(() => {
  vi.clearAllMocks();
  useLocalSearchParams.mockReturnValue({ id: 's1' });
  signInAs(makeUser([...ALL, 'clientes:ver', 'productos:ver'], ['ventas', 'clientes', 'inventario']));
  apiFetch.mockImplementation(async (path: string) => {
    if (path.startsWith('separados?')) return { separados: [separado], total: 1 };
    if (path === 'separados/s1') return separado;
    if (path === '/almacenes') return [{ id: 'a1', codigo: '01', nombre: 'Principal', activo: true }];
    if (path.startsWith('/clientes?'))
      return { clientes: [{ id: 'c1', tipoDocumento: 'CC', numeroDocumento: '123', nombre: 'Ana', apellido: 'Pérez', razonSocial: null, telefono: null }], total: 1 };
    if (path.startsWith('/productos?'))
      return { productos: [{ id: 'p1', codigo: 'CAB', nombre: 'Cable', precioVenta: 50000, estado: 'activo' }], total: 1 };
    return {};
  });
  postIdempotent.mockResolvedValue({ id: 's2' });
});

describe('adapters de separados', () => {
  it('lista con filtro de estado y normaliza montos decimales', async () => {
    const page = await fetchSeparados('pendiente', 1);
    expect(apiFetch).toHaveBeenCalledWith('separados?pagina=1&limite=20&estado=pendiente');
    expect(page.separados[0]).toMatchObject({ total: 100000, anticipo: 20000, saldoPendiente: 80000 });
  });

  it('abonar es POST idempotente con solo el monto', async () => {
    await abonarSeparado('s1', 5000, 'i1');
    expect(postIdempotent).toHaveBeenCalledWith('separados/s1/abonar', { monto: 5000 }, 'i1');
  });

  it('cancelar envía {observaciones} recortadas', async () => {
    await cancelarSeparado('s1', '  cliente desistió  ');
    expect(apiFetch).toHaveBeenCalledWith('separados/s1/cancelar', {
      method: 'POST',
      body: { observaciones: 'cliente desistió' },
    });
  });

  it('fecha límite: formato válido y posterior a hoy', () => {
    const hoy = new Date(2026, 9, 23);
    expect(fechaRetiroPorDefecto(7, hoy)).toBe('2026-10-30');
    expect(esFechaRetiroValida('2026-10-24', hoy)).toBe(true);
    expect(esFechaRetiroValida('2026-10-23', hoy)).toBe(false);
    expect(esFechaRetiroValida('2026-02-30', hoy)).toBe(false);
    expect(esFechaRetiroValida('30/10/2026', hoy)).toBe(false);
  });
});

describe('hooks de separados', () => {
  it('abono: valida contra el saldo y reutiliza la intención en el reintento', async () => {
    const { result } = renderHook(() => useAbonoSeparadoForm('s1', 80000));
    result.current.setAmount('90.000');
    expect(result.current.error).toBe('El abono supera el saldo pendiente');
    result.current.setAmount('10.000,5');
    expect(result.current.invalid).toBe(false);
    postIdempotent.mockRejectedValueOnce(new ApiError(0, 'Red'));
    await expect(result.current.pay()).rejects.toThrow('Red');
    await result.current.pay();
    const [[, body, i1], [, , i2]] = postIdempotent.mock.calls;
    expect(body).toEqual({ monto: 10000.5 });
    expect(i2).toBe(i1);
    result.current.setAmount('1.000');
    await result.current.pay();
    expect(postIdempotent.mock.calls[2][2]).not.toBe(i1);
  });

  it('cancelación exige al menos 5 caracteres', () => {
    const { result } = renderHook(() => useCancelarSeparadoForm('s1'));
    expect(result.current.invalid).toBe(true);
    result.current.setObservaciones('  abc  ');
    expect(result.current.invalid).toBe(true);
    result.current.setObservaciones('abcde');
    expect(result.current.invalid).toBe(false);
  });

  it('formulario de alta: valida y arma el payload sin IVA', async () => {
    const { result } = renderHook(() => useSeparadoForm());
    expect(result.current.error).toBe('Selecciona un cliente.');
    result.current.setCliente({ id: 'c1', tipoDocumento: 'CC', numeroDocumento: '1', nombre: 'Ana', apellido: null, razonSocial: null, telefono: null });
    result.current.setAlmacenId('a1');
    expect(result.current.error).toBe('Agrega al menos un producto.');
    const cable = { id: 'p1', codigo: 'C', codigoBarras: null, nombre: 'Cable', precioVenta: 50000, unidadMedidaId: 'u', estado: 'activo' };
    result.current.addProducto(cable);
    result.current.addProducto(cable);
    expect(result.current.lineas[0].cantidad).toBe('2');
    expect(result.current.total).toBe(100000);
    result.current.setAnticipo('150.000');
    expect(result.current.error).toBe('El anticipo no puede superar el total.');
    result.current.setAnticipo('20.000');
    result.current.setFecha(toLocalYmd());
    expect(result.current.error).toMatch(/posterior a hoy/);
    result.current.setFecha('2099-01-01');
    expect(result.current.error).toBeNull();
    await result.current.submit();
    expect(postIdempotent).toHaveBeenCalledWith(
      'separados',
      { clienteId: 'c1', almacenId: 'a1', items: [{ productoId: 'p1', cantidad: 2 }], anticipo: 20000, fechaLimiteRetiro: '2099-01-01' },
      expect.any(String),
    );
  });
});

describe('pantallas de separados', () => {
  it('lista activos por defecto y abre el detalle', async () => {
    const view = render(withQuery(<SeparadosListScreen />));
    await waitFor(() => view.getByText('SEP-0001 · Activo'));
    view.getByText('Total $100.000 · Saldo $80.000');
    view.press('SEP-0001 · Activo');
    expect(router.push).toHaveBeenLastCalledWith('/(app)/separados/s1');
  });

  it('detalle no muestra IVA y abona con confirmación', async () => {
    const view = render(withQuery(<SeparadoDetailScreen />));
    await waitFor(() => view.getByText('Saldo: $80.000'));
    expect(view.text()).not.toMatch(/IVA|impuesto|119\.000/i);
    view.getByText('Cable × 2 · $100.000');
    view.changeText({ placeholder: 'Monto del abono' }, '30.000');
    view.press(view.queryAllByText('Registrar abono').at(-1)!);
    expect(Alert.alert).toHaveBeenLastCalledWith('Registrar abono', '¿Abonar $30.000 al separado?', expect.any(Array));
    expect(postIdempotent).not.toHaveBeenCalled();
    lastAlertButtons()[1].onPress!();
    await waitFor(() => expect(postIdempotent).toHaveBeenCalledWith('separados/s1/abonar', { monto: 30000 }, expect.any(String)));
  });

  it('cancelar exige motivo de 5+ caracteres y confirma antes de enviar', async () => {
    const view = render(withQuery(<SeparadoDetailScreen />));
    await waitFor(() => expect(view.queryAllByText('Cancelar separado')).toHaveLength(2));
    expect(view.isDisabled(view.queryAllByText('Cancelar separado').at(-1)!)).toBe(true);
    view.changeText({ placeholder: 'Motivo de la cancelación' }, 'abc');
    view.getByText('El motivo debe tener al menos 5 caracteres.');
    view.changeText({ placeholder: 'Motivo de la cancelación' }, 'Cliente desistió');
    view.press(view.queryAllByText('Cancelar separado').at(-1)!);
    lastAlertButtons()[1].onPress!();
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('separados/s1/cancelar', {
        method: 'POST',
        body: { observaciones: 'Cliente desistió' },
      }),
    );
  });

  it('solo ver: sin abono, entrega ni cancelación', async () => {
    signInAs(makeUser(['separados:ver'], ['ventas']));
    const view = render(withQuery(<SeparadoDetailScreen />));
    await waitFor(() => view.getByText('Saldo: $80.000'));
    expect(view.queryByText('Registrar abono')).toBeNull();
    expect(view.queryAllByText('Cancelar separado')).toHaveLength(0);
  });

  it('con saldo cero permite entregar con confirmación', async () => {
    apiFetch.mockImplementation(async (path: string) =>
      path === 'separados/s1' ? { ...separado, saldoPendiente: 0 } : {},
    );
    const view = render(withQuery(<SeparadoDetailScreen />));
    await waitFor(() => view.getByText('Entregar al cliente'));
    expect(view.queryByText('Registrar abono')).toBeNull();
    view.press('Entregar al cliente');
    lastAlertButtons()[1].onPress!();
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('separados/s1/retirar', { method: 'POST', body: {} }));
  });

  it('alta completa: cliente, producto, confirmación y navegación al detalle', async () => {
    const view = render(withQuery(<SeparadoCreateScreen />));
    view.changeText({ placeholder: 'Buscar cliente (nombre o documento)' }, 'ana');
    await waitFor(() => view.getByText('Ana Pérez'), 2000);
    view.press('Ana Pérez');
    view.getByText('Cliente: Ana Pérez');
    await waitFor(() => view.getByText('Almacén: Principal'));
    view.changeText({ placeholder: 'Buscar producto (nombre o código)' }, 'cab');
    await waitFor(() => view.getByText('CAB · $50.000'), 2000);
    view.press('CAB · $50.000');
    view.getByText('Total: $50.000');
    view.changeText({ placeholder: 'Anticipo' }, '10.000');
    view.press('Crear separado');
    expect(vi.mocked(Alert.alert).mock.calls.at(-1)![1]).toBe('Total $50.000 con anticipo de $10.000. ¿Continuar?');
    lastAlertButtons()[1].onPress!();
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/(app)/separados/s2'));
    expect(postIdempotent.mock.calls[0][1]).toMatchObject({ clienteId: 'c1', almacenId: 'a1', anticipo: 10000 });
  });
});

describe('separados con módulo caja', () => {
  const metodos = [
    { id: 'cash', nombre: 'Efectivo', codigo: 'efectivo', estado: 'activo', esEfectivo: true },
    { id: 'nequi', nombre: 'Nequi', codigo: 'nequi', estado: 'activo', esEfectivo: false },
  ];
  beforeEach(() => {
    signInAs(makeUser([...ALL, 'clientes:ver', 'productos:ver'], ['ventas', 'clientes', 'inventario', 'caja']));
    const base = apiFetch.getMockImplementation()!;
    apiFetch.mockImplementation(async (path: string, init?: unknown) =>
      path === '/metodos-pago' ? metodos : base(path, init),
    );
  });

  it('abono: exige método; en efectivo calcula el cambio y envía recibido con Idempotency intent', async () => {
    const view = render(withQuery(<SeparadoDetailScreen />));
    await waitFor(() => view.getByText('Saldo: $80.000'));
    view.changeText({ placeholder: 'Monto del abono' }, '30.000');
    expect(view.isDisabled(view.queryAllByText('Registrar abono').at(-1)!)).toBe(true);
    view.press('Método de pago: Seleccionar');
    await waitFor(() => view.getByText('Efectivo'));
    view.press('Efectivo');
    view.changeText({ placeholder: 'Monto recibido (opcional)' }, '20.000');
    view.getByText('El monto recibido debe cubrir el valor a cobrar.');
    view.changeText({ placeholder: 'Monto recibido (opcional)' }, '50.000');
    view.getByText('Cambio: $20.000');
    view.press(view.queryAllByText('Registrar abono').at(-1)!);
    lastAlertButtons()[1].onPress!();
    await waitFor(() =>
      expect(postIdempotent).toHaveBeenCalledWith(
        'separados/s1/abonar',
        { monto: 30000, metodoPagoId: 'cash', montoRecibido: 50000 },
        expect.any(String),
      ),
    );
  });

  it('cancelar: reembolso opcional con tope en lo abonado', async () => {
    const view = render(withQuery(<SeparadoDetailScreen />));
    await waitFor(() => view.getByText('Reembolso opcional: hasta $20.000. Sale de tu caja abierta.'));
    view.changeText({ placeholder: 'Motivo de la cancelación' }, 'Cliente desistió');
    view.changeText({ placeholder: 'Monto a reembolsar (opcional)' }, '25.000');
    view.getByText('El reembolso supera lo que se puede devolver.');
    view.changeText({ placeholder: 'Monto a reembolsar (opcional)' }, '20.000');
    view.getByText('Selecciona el método del reembolso.');
    view.press('Método del reembolso: Seleccionar');
    await waitFor(() => view.getByText('Nequi'));
    view.press('Nequi');
    view.press(view.queryAllByText('Cancelar separado').at(-1)!);
    expect(vi.mocked(Alert.alert).mock.calls.at(-1)![1]).toMatch(/reembolsarán \$20\.000 desde tu caja/);
    lastAlertButtons()[1].onPress!();
    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('separados/s1/cancelar', {
        method: 'POST',
        body: { observaciones: 'Cliente desistió', reembolso: { metodoPagoId: 'nequi', monto: 20000 } },
      }),
    );
  });

  it('alta: anticipo > 0 exige método; anticipo 0 no', async () => {
    const { result } = renderHook(
      () => useSeparadoForm([{ id: 'cash', nombre: 'Efectivo', esEfectivo: true }]),
      withQuery,
    );
    result.current.setCliente({ id: 'c1', tipoDocumento: 'CC', numeroDocumento: '1', nombre: 'Ana', apellido: null, razonSocial: null, telefono: null });
    result.current.setAlmacenId('a1');
    result.current.addProducto({ id: 'p1', codigo: 'C', codigoBarras: null, nombre: 'Cable', precioVenta: 50000, unidadMedidaId: 'u', estado: 'activo' });
    result.current.setFecha('2099-01-01');
    expect(result.current.error).toBeNull();
    result.current.setAnticipo('10.000');
    expect(result.current.error).toBe('Selecciona el método de pago del anticipo.');
    result.current.setMethod('cash');
    result.current.setReceived('20.000');
    expect(result.current.cobro.cambio).toBe(10000);
    await result.current.submit();
    expect(postIdempotent.mock.calls[0][1]).toMatchObject({ anticipo: 10000, metodoPagoId: 'cash', montoRecibido: 20000 });
  });

  it('CAJA_NO_ABIERTA al abonar muestra el aviso de caja', async () => {
    postIdempotent.mockRejectedValueOnce(new ApiError(409, 'Debes abrir tu caja', { code: 'CAJA_NO_ABIERTA' }));
    const view = render(withQuery(<SeparadoDetailScreen />));
    await waitFor(() => view.getByText('Saldo: $80.000'));
    view.changeText({ placeholder: 'Monto del abono' }, '30.000');
    view.press('Método de pago: Seleccionar');
    await waitFor(() => view.getByText('Nequi'));
    view.press('Nequi');
    view.press(view.queryAllByText('Registrar abono').at(-1)!);
    lastAlertButtons()[1].onPress!();
    await waitFor(() => expect(vi.mocked(Alert.alert).mock.calls.at(-1)![0]).toBe('Caja cerrada'));
  });
});

describe('separados sin módulo caja', () => {
  it('no pide método ni ofrece reembolso, ni consulta métodos', async () => {
    const view = render(withQuery(<SeparadoDetailScreen />));
    await waitFor(() => view.getByText('Saldo: $80.000'));
    expect(view.queryByText(/Método de pago/)).toBeNull();
    expect(view.queryByText(/Reembolso/)).toBeNull();
    expect(apiFetch).not.toHaveBeenCalledWith('/metodos-pago');
  });
});
