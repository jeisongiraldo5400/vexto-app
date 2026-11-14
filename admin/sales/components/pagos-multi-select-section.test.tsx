import { describe, expect, it, vi } from 'vitest';

import type { MetodoPago } from '@/core/types';
import { render } from '@/test-utils/renderer';

import {
  PagosMultiSelectSection,
  createInitialPagosLineasMobile,
  findDefaultMetodoId,
  lineasToPayload,
  validarPagosLineasMobile,
  type PagoLineaMobile,
} from './pagos-multi-select-section';

const metodos: MetodoPago[] = [
  { id: 'nequi', nombre: 'Nequi', codigo: 'nequi', estado: 'activo' },
  { id: 'cash', nombre: 'Efectivo', codigo: 'efectivo', estado: 'activo' },
];
const linea = (metodoPagoId: string, monto: string, montoRecibido = ''): PagoLineaMobile => ({
  id: `${metodoPagoId}-${monto}`,
  metodoPagoId,
  monto,
  montoRecibido,
});
const c = {
  text: '#000',
  textSecondary: '#111',
  border: '#222',
  card: '#fff',
  background: '#fff',
  success: 'green',
  error: 'red',
  warning: 'orange',
};

describe('líneas de pago (es-CO)', () => {
  it('elige efectivo por defecto con el total formateado', () => {
    expect(findDefaultMetodoId(metodos)).toBe('cash');
    expect(findDefaultMetodoId([metodos[0]])).toBe('nequi');
    expect(findDefaultMetodoId([])).toBe('');
    const [l] = createInitialPagosLineasMobile(metodos, 1500.5);
    expect(l).toMatchObject({ metodoPagoId: 'cash', monto: '1.500,5', montoRecibido: '' });
    expect(createInitialPagosLineasMobile([], 1000)).toEqual([]);
  });

  it('convierte montos es-CO al payload y omite montoRecibido vacío', () => {
    expect(
      lineasToPayload([linea('cash', '50.000', '100.000'), linea('nequi', '1.500,50'), linea('nequi', 'abc')]),
    ).toEqual([
      { metodoPagoId: 'cash', monto: 50000, montoRecibido: 100000 },
      { metodoPagoId: 'nequi', monto: 1500.5 },
      { metodoPagoId: 'nequi', monto: 0 },
    ]);
  });

  it('valida que la suma iguale el total', () => {
    expect(validarPagosLineasMobile([], 1000, metodos)).toBe('Selecciona al menos un método de pago');
    expect(validarPagosLineasMobile([linea('nequi', '40.000')], 50000, metodos)).toBe(
      'La suma ($40.000) debe ser $50.000',
    );
    expect(
      validarPagosLineasMobile([linea('nequi', '20.000'), linea('nequi', '30.000')], 50000, metodos),
    ).toBeNull();
  });

  it('tolera centavos de redondeo pero exige montos positivos', () => {
    expect(validarPagosLineasMobile([linea('nequi', '33.333,33')], 33333.335, metodos)).toBeNull();
    expect(
      validarPagosLineasMobile([linea('nequi', '60.000'), linea('nequi', '-10.000')], 50000, metodos),
    ).not.toBeNull();
    expect(validarPagosLineasMobile([linea('nequi', '50.000'), linea('nequi', '0')], 50000, metodos)).toBe(
      'Cada línea debe tener un monto mayor a 0',
    );
  });

  it('exige recibido ≥ monto para efectivo', () => {
    const err = 'Indica el monto recibido en efectivo (≥ monto aplicado)';
    expect(validarPagosLineasMobile([linea('cash', '50.000')], 50000, metodos)).toBe(err);
    expect(validarPagosLineasMobile([linea('cash', '50.000', '40.000')], 50000, metodos)).toBe(err);
    expect(validarPagosLineasMobile([linea('cash', '50.000', '50.000')], 50000, metodos)).toBeNull();
    expect(validarPagosLineasMobile([linea('cash', '50.000', '$ 100.000')], 50000, metodos)).toBeNull();
  });
});

describe('PagosMultiSelectSection', () => {
  it('muestra restante y vuelto con formato es-CO', () => {
    const view = render(
      <PagosMultiSelectSection
        metodos={metodos}
        lineas={[linea('cash', '30.000', '50.000')]}
        totalObjetivo={80000}
        onLineasChange={vi.fn()}
        tint="blue"
        c={c}
      />,
    );
    expect(view.text()).toContain('Total: $80.000');
    expect(view.text()).toContain('Restante: $50.000');
    expect(view.text()).toContain('Vuelto: $20.000');
  });

  it('agregar un método propone el restante y quitarlo lo recuerda', () => {
    const onChange = vi.fn();
    const lineas = [linea('cash', '30.000', '30.000')];
    const view = render(
      <PagosMultiSelectSection
        metodos={metodos}
        lineas={lineas}
        totalObjetivo={80000}
        onLineasChange={onChange}
        tint="blue"
        c={c}
      />,
    );
    view.press('Nequi');
    expect(onChange.mock.calls[0][0][1]).toMatchObject({ metodoPagoId: 'nequi', monto: '50.000' });

    view.press(view.getByText('Efectivo'));
    expect(onChange.mock.calls[1][0]).toEqual([]);
  });

  it('el primer método toma el total y sanea lo escrito', () => {
    const onChange = vi.fn();
    const view = render(
      <PagosMultiSelectSection metodos={metodos} lineas={[]} totalObjetivo={1500} onLineasChange={onChange} tint="b" c={c} />,
    );
    expect(view.text()).toContain('Selecciona al menos un método de pago.');
    view.press('Nequi');
    expect(onChange.mock.calls[0][0][0]).toMatchObject({ metodoPagoId: 'nequi', monto: '1.500' });
  });

  it('el campo de monto sanea caracteres ajenos', () => {
    const onChange = vi.fn();
    const l = linea('nequi', '');
    const view = render(
      <PagosMultiSelectSection metodos={metodos} lineas={[l]} totalObjetivo={1500} onLineasChange={onChange} tint="b" c={c} />,
    );
    view.changeText({ placeholder: '0' }, '$ 1.5a00');
    expect(onChange).toHaveBeenCalledWith([{ ...l, monto: '1.500' }]);
  });
});
