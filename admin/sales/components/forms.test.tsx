import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/core/http/api-error';
import type { Cliente, MetodoPago } from '@/core/types';
import { makeUser, signInAs, withQuery } from '@/test-utils/fixtures';
import { render, waitFor } from '@/test-utils/renderer';

import { ClienteVentaSection } from './cliente-venta-section';
import { CreditoVentaModal } from './credito-venta-modal';
import { NuevoClienteModal } from './nuevo-cliente-modal';
import { PagosVentaModal } from './pagos-venta-modal';

const { crearCliente, fetchClientesBusqueda } = vi.hoisted(() => ({
  crearCliente: vi.fn(),
  fetchClientesBusqueda: vi.fn(),
}));
vi.mock('@/admin/sales/adapters/clientes.adapter', () => ({ crearCliente, fetchClientesBusqueda }));
vi.mock('@/hooks/use-debounced-value', () => ({ useDebouncedValue: <T,>(v: T) => v }));

const cliente: Cliente = {
  id: 'c1',
  tipoDocumento: 'CC',
  numeroDocumento: '123',
  nombre: 'Ana',
  apellido: 'Pérez',
  razonSocial: null,
  telefono: null,
};

beforeEach(() => {
  vi.resetAllMocks();
  signInAs(makeUser(['pos:crear'], ['pos']));
  fetchClientesBusqueda.mockResolvedValue({ clientes: [cliente], total: 1 });
});

describe('NuevoClienteModal', () => {
  const setup = () => {
    const onCreated = vi.fn();
    const onClose = vi.fn();
    const view = render(withQuery(<NuevoClienteModal visible tint="b" onPrimary="w" onClose={onClose} onCreated={onCreated} />));
    const inputs = () => view.queryAll((n) => n.type === 'TextInput');
    return { view, onCreated, onClose, inputs };
  };

  it('valida documento, nombre y correo antes de enviar', () => {
    const { view, inputs } = setup();
    view.press('Guardar');
    expect(view.text()).toContain('Indica el número de documento.');
    view.changeText(inputs()[0], ' 123 ');
    view.press('Guardar');
    expect(view.text()).toContain('El nombre es obligatorio.');
    view.changeText(inputs()[1], 'Ana');
    view.changeText(inputs()[4], 'no-es-correo');
    view.press('Guardar');
    expect(view.text()).toContain('Correo inválido.');
    expect(crearCliente).not.toHaveBeenCalled();
  });

  it('envía el payload de persona natural recortado y sin opcionales vacíos', async () => {
    crearCliente.mockResolvedValue(cliente);
    const { view, inputs, onCreated, onClose } = setup();
    view.changeText(inputs()[0], ' 123 ');
    view.changeText(inputs()[1], ' Ana ');
    view.changeText(inputs()[2], ' Pérez ');
    view.press('Guardar');
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(cliente));
    expect(crearCliente).toHaveBeenCalledWith({ tipoDocumento: 'CC', numeroDocumento: '123', nombre: 'Ana', apellido: 'Pérez' });
    expect(onClose).toHaveBeenCalled();
  });

  it('para NIT exige razón social y la usa como nombre', async () => {
    crearCliente.mockResolvedValue(cliente);
    const { view, inputs, onCreated } = setup();
    view.press('NIT');
    view.changeText(inputs()[0], '900123');
    view.press('Guardar');
    expect(view.text()).toContain('La razón social es obligatoria para NIT.');
    view.changeText(inputs()[1], 'Tecno SAS');
    view.changeText(inputs()[2], ' 300 ');
    view.changeText(inputs()[3], 'a@b.co');
    view.press('Guardar');
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(crearCliente).toHaveBeenCalledWith({
      tipoDocumento: 'NIT',
      numeroDocumento: '900123',
      nombre: 'Tecno SAS',
      razonSocial: 'Tecno SAS',
      telefono: '300',
      email: 'a@b.co',
    });
  });

  it('muestra el error del servidor', async () => {
    crearCliente.mockRejectedValue(new ApiError(409, 'Documento ya registrado'));
    const { view, inputs, onCreated } = setup();
    view.changeText(inputs()[0], '1');
    view.changeText(inputs()[1], 'Ana');
    view.press('Guardar');
    await waitFor(() => expect(view.text()).toContain('Documento ya registrado'));
    expect(onCreated).not.toHaveBeenCalled();
  });
});

describe('ClienteVentaSection', () => {
  it('busca clientes existentes y permite elegir y quitar', async () => {
    const onCliente = vi.fn();
    const onModo = vi.fn();
    const view = render(
      withQuery(
        <ClienteVentaSection modo="existente" onModo={onModo} cliente={null} onCliente={onCliente}
          metodoPago={null} tint="b" tintMuted="m" onPrimary="w" />,
      ),
    );
    view.changeText({ placeholder: 'Buscar cliente…' }, 'An');
    await waitFor(() => view.getByText('Ana Pérez · CC 123'));
    expect(fetchClientesBusqueda).toHaveBeenCalledWith('An');
    view.press('Ana Pérez · CC 123');
    expect(onCliente).toHaveBeenCalledWith(cliente);
    view.press('Sin cliente');
    expect(onCliente).toHaveBeenLastCalledWith(null);
    expect(onModo).toHaveBeenLastCalledWith('ninguno');
  });

  it('con método de crédito el cliente es requerido', () => {
    const view = render(
      withQuery(
        <ClienteVentaSection modo="existente" onModo={vi.fn()} cliente={cliente} onCliente={vi.fn()}
          metodoPago={{ id: 'x', nombre: 'Addi', codigo: 'addi', estado: 'activo' }} tint="b" tintMuted="m" onPrimary="w" />,
      ),
    );
    expect(view.text()).toContain('Cliente (requerido para crédito)');
    expect(view.isDisabled('Sin cliente')).toBe(true);
    expect(view.text()).toContain('Cliente en la venta');
  });
});

const metodos: MetodoPago[] = [
  { id: 'cash', nombre: 'Efectivo', codigo: 'efectivo', estado: 'activo' },
  { id: 'nequi', nombre: 'Nequi', codigo: 'nequi', estado: 'activo' },
  { id: 'cred', nombre: 'Crédito', codigo: 'credito', estado: 'activo' },
  { id: 'old', nombre: 'Cheque', codigo: 'cheque', estado: 'inactivo' },
];

describe('PagosVentaModal', () => {
  const setup = (almacenId: string | null = 'a1') => {
    const onConfirm = vi.fn();
    const view = render(
      <PagosVentaModal visible metodos={metodos} totalVenta={50000} almacenId={almacenId}
        almacenes={[{ id: 'a1', nombre: 'Principal' }]} initialAlmacenId={almacenId} onAlmacenChange={vi.fn()}
        onConfirm={onConfirm} onClose={vi.fn()} tint="b" onPrimary="w" />,
    );
    return { view, onConfirm };
  };

  it('excluye crédito interno e inactivos y precarga efectivo con el total', () => {
    const { view } = setup();
    expect(view.queryByText('Crédito')).toBeNull();
    expect(view.queryByText('Cheque')).toBeNull();
    expect(view.getByProps({ value: '50.000' })).toBeTruthy();
  });

  it('exige el recibido en efectivo y confirma las líneas', () => {
    const { view, onConfirm } = setup();
    view.press('Confirmar cobro');
    expect(view.text()).toContain('Indica el monto recibido en efectivo');
    expect(onConfirm).not.toHaveBeenCalled();
    const recibido = view.queryAll((n) => n.type === 'TextInput')[1];
    view.changeText(recibido, '100.000');
    expect(view.text()).toContain('Vuelto: $50.000');
    view.press('Confirmar cobro');
    expect(onConfirm).toHaveBeenCalledWith([expect.objectContaining({ metodoPagoId: 'cash', monto: '50.000', montoRecibido: '100.000' })]);
  });

  it('sin almacén no confirma', () => {
    const { view, onConfirm } = setup(null);
    view.press('Confirmar cobro');
    expect(view.text()).toContain('Selecciona un almacén');
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('CreditoVentaModal', () => {
  const metodosCredito: MetodoPago[] = [
    { id: 'cash', nombre: 'Caja menor', codigo: 'caja_menor', estado: 'activo', esEfectivo: true },
    { id: 'nequi', nombre: 'Nequi', codigo: 'nequi', estado: 'activo', esEfectivo: false },
    { id: 'cred', nombre: 'Crédito', codigo: 'credito', estado: 'activo', esEfectivo: false },
    { id: 'sep', nombre: 'Separado', codigo: 'separado', estado: 'activo', esEfectivo: false },
    { id: 'old', nombre: 'Cheque', codigo: 'cheque', estado: 'inactivo', esEfectivo: false },
  ];
  const soloNequi = [metodosCredito[1]];
  const cart = [{ producto: { id: 'p', codigo: 'c', codigoBarras: null, nombre: 'Tv', precioVenta: 300000, unidadMedidaId: 'u', estado: 'a' }, cantidad: 1, stockDisponible: null }];
  const setup = (props: Partial<{ almacenId: string | null; cart: typeof cart; metodos: MetodoPago[] }> = {}) => {
    const onConfirm = vi.fn();
    const view = render(
      withQuery(
        <CreditoVentaModal visible cart={props.cart ?? cart} metodos={props.metodos ?? soloNequi} almacenId={props.almacenId === undefined ? 'a1' : props.almacenId}
          totalVenta={300000} onConfirm={onConfirm} onClose={vi.fn()} tint="b" onPrimary="w" />,
      ),
    );
    return { view, onConfirm };
  };
  const pickCliente = async (view: ReturnType<typeof setup>['view']) => {
    view.changeText({ placeholder: 'Buscar cliente…' }, 'Ana');
    await waitFor(() => view.getByText('Ana Pérez · CC 123'));
    view.press('Ana Pérez · CC 123');
  };

  it('muestra el cronograma por defecto (3 cuotas de 30 días)', () => {
    const { view } = setup();
    expect(view.text()).toContain('Total: $300.000');
    expect(view.queryAllByText(/^Cuota \d$/)).toHaveLength(3);
    expect(view.text()).toContain('$100.000');
  });

  it('valida almacén y cliente', async () => {
    const noAlmacen = setup({ almacenId: null });
    noAlmacen.view.press('Confirmar crédito');
    expect(noAlmacen.view.text()).toContain('Selecciona un almacén');
    noAlmacen.view.unmount();

    const { view, onConfirm } = setup();
    view.press('Confirmar crédito');
    expect(view.text()).toContain('Selecciona un cliente');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('rechaza cuota inicial mayor al total', async () => {
    const { view, onConfirm } = setup();
    await pickCliente(view);
    view.changeText({ placeholder: 'Primera cuota del cronograma (opcional)' }, '400.000');
    view.press('Confirmar crédito');
    expect(view.text()).toContain('La cuota inicial no puede superar el total');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('envía cuota inicial es-CO, cuotas y frecuencia', async () => {
    const { view, onConfirm } = setup();
    await pickCliente(view);
    view.changeText({ placeholder: 'Primera cuota del cronograma (opcional)' }, '100.000');
    const [cuotas, frecuencia] = view.queryAll((n) => n.type === 'TextInput' && n.props.keyboardType === 'number-pad');
    view.changeText(cuotas, '4');
    view.changeText(frecuencia, '15');
    expect(view.text()).toContain('Inicial');
    expect(view.text()).toContain('$50.000');
    view.press('Confirmar crédito');
    expect(onConfirm).toHaveBeenCalledWith({
      clienteId: 'c1',
      cuotaInicial: 100000,
      numeroCuotas: 4,
      frecuenciaDias: 15,
      pagosCuotaInicial: [{ metodoPagoId: 'nequi', monto: 100000 }],
    });
  });

  it('sin cuota inicial no pide métodos ni envía pagosCuotaInicial', async () => {
    const { view, onConfirm } = setup({ metodos: metodosCredito });
    await pickCliente(view);
    expect(view.queryByText('Cobro de la cuota inicial')).toBeNull();
    view.press('Confirmar crédito');
    expect(onConfirm).toHaveBeenCalledWith({ clienteId: 'c1', cuotaInicial: 0, numeroCuotas: 3, frecuenciaDias: 30 });
  });

  it('cuota inicial en efectivo: excluye crédito/separado/inactivos, exige recibido y muestra el cambio', async () => {
    const { view, onConfirm } = setup({ metodos: metodosCredito });
    await pickCliente(view);
    view.changeText({ placeholder: 'Primera cuota del cronograma (opcional)' }, '100.000');
    view.getByText('Cobro de la cuota inicial');
    // Métodos ofrecidos: solo efectivo y Nequi.
    view.getByText('Caja menor');
    view.getByText('Nequi');
    expect(view.queryByText('Separado')).toBeNull();
    expect(view.queryByText('Cheque')).toBeNull();
    expect(view.queryAllByText('Crédito')).toHaveLength(0);
    // La línea por defecto es el efectivo (por esEfectivo) por toda la cuota.
    view.getByText('Recibido');
    view.press('Confirmar crédito');
    expect(view.text()).toContain('Indica el monto recibido en efectivo (≥ monto aplicado)');
    expect(onConfirm).not.toHaveBeenCalled();
    view.changeText(view.queryAll((n) => n.type === 'TextInput' && n.props.placeholder === '0')[1], '120.000');
    view.getByText('Vuelto: $20.000');
    view.press('Confirmar crédito');
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        cuotaInicial: 100000,
        pagosCuotaInicial: [{ metodoPagoId: 'cash', monto: 100000, montoRecibido: 120000 }],
      }),
    );
  });

  it('cuota inicial con varios métodos: la suma debe igualar la cuota', async () => {
    const { view, onConfirm } = setup({ metodos: metodosCredito });
    await pickCliente(view);
    view.changeText({ placeholder: 'Primera cuota del cronograma (opcional)' }, '100.000');
    view.press('Nequi'); // agrega Nequi con el restante (0)
    // [monto efectivo, recibido efectivo, monto Nequi]; se vuelve a consultar tras cada render.
    const input = (i: number) => view.queryAll((n) => n.type === 'TextInput' && n.props.placeholder === '0')[i];
    view.changeText(input(0), '60.000');
    view.changeText(input(1), '60.000');
    view.changeText(input(2), '30.000');
    view.press('Confirmar crédito');
    expect(view.text()).toContain('La suma ($90.000) debe ser $100.000');
    expect(onConfirm).not.toHaveBeenCalled();
    view.changeText(input(2), '40.000');
    view.press('Confirmar crédito');
    expect(onConfirm.mock.calls[0][0].pagosCuotaInicial).toEqual([
      { metodoPagoId: 'cash', monto: 60000, montoRecibido: 60000 },
      { metodoPagoId: 'nequi', monto: 40000 },
    ]);
  });

  it('sin métodos seleccionados no confirma la cuota inicial', async () => {
    const { view, onConfirm } = setup({ metodos: soloNequi });
    await pickCliente(view);
    view.changeText({ placeholder: 'Primera cuota del cronograma (opcional)' }, '50.000');
    view.press('Nequi'); // quita la única línea
    view.press('Confirmar crédito');
    expect(view.text()).toContain('Selecciona al menos un método de pago');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('rechaza una cuota inicial mal escrita en lugar de tomarla como 0', async () => {
    const { view, onConfirm } = setup();
    await pickCliente(view);
    view.changeText({ placeholder: 'Primera cuota del cronograma (opcional)' }, '1.50.000');
    view.press('Confirmar crédito');
    expect(view.text()).toContain('Cuota inicial inválida');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('al reabrirse no conserva el cliente ni la cuota de la venta anterior', async () => {
    const onConfirm = vi.fn();
    const el = (visible: boolean) => (
      <CreditoVentaModal visible={visible} cart={cart} metodos={soloNequi} almacenId="a1" totalVenta={300000}
        onConfirm={onConfirm} onClose={vi.fn()} tint="b" onPrimary="w" />
    );
    let visible = true;
    function Host() {
      return el(visible);
    }
    const view = render(withQuery(<Host />));
    await pickCliente(view);
    view.changeText({ placeholder: 'Primera cuota del cronograma (opcional)' }, '100.000');
    view.press('Confirmar crédito');
    expect(onConfirm).toHaveBeenCalledTimes(1);
    visible = false;
    view.rerender();
    visible = true;
    view.rerender();
    expect(view.text()).not.toContain('Cliente en la venta');
    expect(view.getByProps({ placeholder: 'Primera cuota del cronograma (opcional)' }).props.value).toBe('0');
    view.press('Confirmar crédito');
    expect(view.text()).toContain('Selecciona un cliente');
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
