import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Colors } from '@/constants/theme';
import type { Producto } from '@/core/types';
import { render } from '@/test-utils/renderer';
import { Platform } from 'react-native';

import { BarcodeScannerModal } from './barcode-scanner-modal';
import { CartLinesList, type CartLine } from './cart-lines-list';
import { QuantityNumpadModal } from './quantity-numpad-modal';
import { VentaFooter } from './venta-footer';
import { VentaSuccessModal } from './venta-success-modal';
import { WarehousePaymentPicker } from './warehouse-payment-picker';

const producto = (id = 'p1', precioVenta = 2500): Producto => ({
  id,
  codigo: `C-${id}`,
  codigoBarras: null,
  nombre: `Producto ${id}`,
  precioVenta,
  unidadMedidaId: 'u',
  estado: 'activo',
});

beforeEach(() => vi.clearAllMocks());

describe('QuantityNumpadModal', () => {
  const setup = (stockDisponible: number | null) => {
    const onConfirm = vi.fn();
    const view = render(
      <QuantityNumpadModal
        visible
        product={producto('p1', 1000)}
        stockDisponible={stockDisponible}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    const tap = (d: string) => view.press(view.getByProps({ accessibilityLabel: d === '0' ? 'Número cero' : `Número ${d}` }));
    const confirmBtn = () => view.queryAll((n) => n.props.onPress && /Agregar al carrito|stock|cantidad válida/.test(n.props.accessibilityLabel ?? ''))[0];
    return { view, tap, onConfirm, confirmBtn };
  };

  it('no confirma con cantidad 0 y confirma la cantidad tecleada', () => {
    const { view, tap, onConfirm, confirmBtn } = setup(null);
    expect(confirmBtn().props.disabled).toBe(true);
    tap('0');
    expect(view.getByProps({ accessibilityRole: 'header' }).children).toEqual(['0']);
    tap('1');
    tap('2');
    expect(view.text()).toContain('Subtotal aprox.: $12.000');
    view.press(confirmBtn());
    expect(onConfirm).toHaveBeenCalledWith(12);
  });

  it('ignora dígitos que superan el stock disponible', () => {
    const { view, tap, onConfirm, confirmBtn } = setup(15);
    expect(view.text()).toContain('Disponible: 15 unid.');
    tap('1');
    tap('9'); // 19 > 15: se ignora
    expect(view.getByProps({ accessibilityRole: 'header' }).children).toEqual(['1']);
    tap('5');
    view.press(confirmBtn());
    expect(onConfirm).toHaveBeenCalledWith(15);
  });

  it('limita a 4 dígitos y permite borrar', () => {
    const { view, tap } = setup(null);
    for (const d of ['9', '8', '7', '6', '5']) tap(d);
    const display = () => view.getByProps({ accessibilityRole: 'header' }).children[0];
    expect(display()).toBe('9876');
    view.press(view.getByProps({ accessibilityLabel: 'Borrar último número' }));
    expect(display()).toBe('987');
    view.press(view.getByProps({ accessibilityLabel: 'Limpiar cantidad' }));
    expect(display()).toBe('0');
  });

  it('sin stock deshabilita agregar', () => {
    const { view, tap, confirmBtn } = setup(0);
    expect(view.text()).toContain('Sin stock disponible');
    tap('1');
    expect(confirmBtn().props.disabled).toBe(true);
  });

  it('sin producto no renderiza nada', () => {
    const view = render(
      <QuantityNumpadModal visible product={null} stockDisponible={null} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(view.text()).toBe('');
  });
});

describe('CartLinesList', () => {
  it('muestra el estado vacío', () => {
    const view = render(<CartLinesList cart={[]} onChangeQty={vi.fn()} onScanPress={vi.fn()} />);
    expect(view.text()).toContain('Sin productos aún');
    expect(view.text()).toContain('CarritoEscanear0');
  });

  it('muestra líneas, subtotales es-CO y respeta el máximo de stock', () => {
    const onChangeQty = vi.fn();
    const cart: CartLine[] = [
      { producto: producto('a', 1500000), cantidad: 2, stockDisponible: 2 },
      { producto: producto('b', 990), cantidad: 1, stockDisponible: null },
    ];
    const view = render(<CartLinesList cart={cart} onChangeQty={onChangeQty} />);
    expect(view.text()).toContain('$1.500.000 c/u · $3.000.000');
    expect(view.text()).toContain('Máx. disponible: 2');
    expect(view.text()).toContain('Carrito3');
    expect(view.queryByText('Escanear')).toBeNull();
    const plus = view.queryAll((n) => n.type === 'Pressable' && textIs(n, '+'));
    expect(plus[0].props.disabled).toBe(true);
    view.press(plus[1]);
    expect(onChangeQty).toHaveBeenCalledWith('b', 2);
    view.press(view.queryAll((n) => n.type === 'Pressable' && textIs(n, '−'))[0]);
    expect(onChangeQty).toHaveBeenCalledWith('a', 1);
  });
});

function textIs(n: { children: unknown[] }, t: string): boolean {
  return n.children.some((c) => (typeof c === 'string' ? c === t : textIs(c as { children: unknown[] }, t)));
}

describe('VentaFooter', () => {
  const c = Colors.light;
  it('muestra total y error; bloquea botones mientras se envía', () => {
    const onCobrar = vi.fn();
    const onCredito = vi.fn();
    const view = render(
      <VentaFooter c={c} bottomInset={0} footerLift={0} total={45000} submitErr="Falló" ventaPending={false}
        creditoPending={false} onCobrar={onCobrar} onCredito={onCredito} />,
    );
    expect(view.text()).toContain('$45.000');
    expect(view.text()).toContain('Falló');
    view.press('Cobrar venta');
    view.press('Vender a crédito');
    expect(onCobrar).toHaveBeenCalled();
    expect(onCredito).toHaveBeenCalled();

    const pending = render(
      <VentaFooter c={c} bottomInset={0} footerLift={0} total={1} submitErr={null} ventaPending
        creditoPending={false} onCobrar={vi.fn()} onCredito={vi.fn()} />,
    );
    expect(pending.queryByText('Cobrar venta')).toBeNull();
    expect(pending.isDisabled('Vender a crédito')).toBe(true);
  });
});

describe('VentaSuccessModal', () => {
  it('muestra la factura, ítems y total', () => {
    const onClose = vi.fn();
    const view = render(
      <VentaSuccessModal visible tint="b" onPrimary="w" onClose={onClose}
        venta={{ id: 'v', numeroFactura: 'F-10', total: 7500, items: [
          { productoId: 'p', productoNombre: 'Cable', cantidad: 3, precioUnitario: 2500, subtotal: 7500 },
        ] }} />,
    );
    expect(view.text()).toContain('Factura F-10');
    expect(view.text()).toContain('3 × $2.500');
    expect(view.text()).toContain('Total$7.500');
    view.press('Nueva venta');
    expect(onClose).toHaveBeenCalled();
  });
});

describe('WarehousePaymentPicker', () => {
  const alm = (id: string) => ({ id, codigo: id, nombre: `Bodega ${id}`, activo: true });
  it('con un almacén solo lo muestra; con varios permite elegir', () => {
    const one = render(<WarehousePaymentPicker almacenes={[alm('1')]} almacenId="1" hideMetodo tint="b" tintMuted="m" onAlmacen={vi.fn()} />);
    expect(one.text()).toContain('Almacén: Bodega 1');

    const onAlmacen = vi.fn();
    const many = render(<WarehousePaymentPicker almacenes={[alm('1'), alm('2')]} almacenId="1" hideMetodo tint="b" tintMuted="m" onAlmacen={onAlmacen} />);
    many.press('Bodega 1');
    many.press(many.queryAllByText('Bodega 2')[0]);
    expect(onAlmacen).toHaveBeenCalledWith('2');
    expect(many.queryByText('Seleccionar almacén')).toBeNull();
  });
});

describe('BarcodeScannerModal', () => {
  it('entrega el código recortado e ignora lecturas repetidas inmediatas', () => {
    const onCode = vi.fn();
    const view = render(<BarcodeScannerModal visible tint="b" feedback="No encontrado" onClose={vi.fn()} onClearFeedback={vi.fn()} onCode={onCode} />);
    expect(view.text()).toContain('No encontrado');
    const cam = view.queryAll((n) => n.type === 'CameraView')[0];
    view.fire(cam, 'onBarcodeScanned', { data: ' 7701 ' });
    view.fire(cam, 'onBarcodeScanned', { data: '7701' });
    view.fire(cam, 'onBarcodeScanned', { data: '   ' });
    expect(onCode).toHaveBeenCalledTimes(1);
    expect(onCode).toHaveBeenCalledWith('7701');
    view.press('Listo para otro');
    view.fire(cam, 'onBarcodeScanned', { data: '7702' });
    expect(onCode).toHaveBeenLastCalledWith('7702');
  });

  it('en web permite escribir el código manualmente', () => {
    Platform.OS = 'web';
    try {
      const onCode = vi.fn();
      const view = render(<BarcodeScannerModal visible tint="b" feedback={null} onClose={vi.fn()} onClearFeedback={vi.fn()} onCode={onCode} />);
      view.changeText({ placeholder: 'Código de barras' }, ' ABC ');
      view.press('Buscar producto');
      expect(onCode).toHaveBeenCalledWith('ABC');
    } finally {
      Platform.OS = 'ios';
    }
  });
});
