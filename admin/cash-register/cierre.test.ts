import { describe, expect, it } from 'vitest';

import {
  DENOMINACIONES_COP,
  calcularDiferencia,
  denominacionesPayload,
  etiquetaDiferencia,
  evaluarCierre,
  tipoDiferencia,
  totalDenominaciones,
} from './cierre';
import { evaluarCobro, evaluarReembolso, cobroPayload, metodosDeCaja } from './cobro';

const base = { esperado: 520000, contadoTexto: '', usarDenominaciones: false, conteo: {}, observaciones: '' };

describe('denominaciones colombianas', () => {
  it('cubre billetes de 100.000 a 2.000 y monedas de 1.000 a 50, de mayor a menor', () => {
    expect(DENOMINACIONES_COP.filter((d) => d.tipo === 'billete').map((d) => d.valor)).toEqual([100000, 50000, 20000, 10000, 5000, 2000]);
    expect(DENOMINACIONES_COP.filter((d) => d.tipo === 'moneda').map((d) => d.valor)).toEqual([1000, 500, 200, 100, 50]);
  });

  it('suma valor × cantidad y acepta miles con punto', () => {
    expect(totalDenominaciones({})).toBe(0);
    expect(totalDenominaciones({ 100000: '5', 20000: '1', 50: '3' })).toBe(520150);
    expect(totalDenominaciones({ 50: '1.000' })).toBe(50000);
  });

  it('una cantidad no entera invalida el total', () => {
    expect(totalDenominaciones({ 100000: '1,5' })).toBeNaN();
  });

  it('el payload omite ceros y vacíos y conserva el orden', () => {
    expect(denominacionesPayload({ 50: '2', 100000: '1', 20000: '0', 500: '' })).toEqual([
      { valor: 100000, cantidad: 1 },
      { valor: 50, cantidad: 2 },
    ]);
  });
});

describe('diferencia del arqueo', () => {
  it('contado − esperado sin ruido de coma flotante', () => {
    expect(calcularDiferencia(0.3, 0.1 + 0.2)).toBe(0);
    expect(calcularDiferencia(520000, 500000)).toBe(-20000);
    expect(calcularDiferencia(100.5, 101)).toBe(0.5);
  });

  it('clasifica y etiqueta sobrante, faltante y cuadre', () => {
    expect(tipoDiferencia(0)).toBe('cuadrada');
    expect(etiquetaDiferencia(0)).toBe('Caja cuadrada');
    expect(etiquetaDiferencia(5000)).toBe('Sobrante $5.000');
    expect(etiquetaDiferencia(-20000)).toBe('Faltante $20.000');
  });
});

describe('evaluarCierre', () => {
  it('pide el contado antes de calcular nada', () => {
    expect(evaluarCierre(base)).toMatchObject({ diferencia: null, tipo: null, error: 'Indica el efectivo contado.' });
    const invalido = evaluarCierre({ ...base, contadoTexto: '1.2.3' });
    expect(invalido.error).toBe('Efectivo contado inválido.');
    expect(invalido.payload).toBeUndefined();
    expect(evaluarCierre({ ...base, usarDenominaciones: true }).error).toMatch(/Cuenta los billetes/);
  });

  it('caja cuadrada: no exige observaciones', () => {
    const ev = evaluarCierre({ ...base, contadoTexto: '520.000' });
    expect(ev).toMatchObject({ contado: 520000, diferencia: 0, tipo: 'cuadrada', requiereObservaciones: false, error: null });
    expect(ev.payload).toEqual({ efectivoContado: 520000 });
  });

  it('con diferencia las observaciones son obligatorias', () => {
    const sin = evaluarCierre({ ...base, contadoTexto: '500.000', observaciones: '   ' });
    expect(sin).toMatchObject({ diferencia: -20000, tipo: 'faltante', requiereObservaciones: true, payload: undefined });
    expect(sin.error).toBe('Explica la diferencia en las observaciones.');
    const con = evaluarCierre({ ...base, contadoTexto: '525.000', observaciones: '  Sobró cambio  ' });
    expect(con).toMatchObject({ diferencia: 5000, tipo: 'sobrante', error: null });
    expect(con.payload).toEqual({ efectivoContado: 525000, observaciones: 'Sobró cambio' });
  });

  it('por denominaciones el contado es la suma y viaja el desglose', () => {
    const ev = evaluarCierre({ ...base, contadoTexto: '1', usarDenominaciones: true, conteo: { 100000: '5', 20000: '1' } });
    expect(ev).toMatchObject({ contado: 520000, diferencia: 0, error: null });
    expect(ev.payload).toEqual({
      efectivoContado: 520000,
      denominaciones: [
        { valor: 100000, cantidad: 5 },
        { valor: 20000, cantidad: 1 },
      ],
    });
  });

  it('caja vacía contada en ceros es un cierre válido', () => {
    const ev = evaluarCierre({ ...base, esperado: 0, usarDenominaciones: true, conteo: { 50: '0' } });
    expect(ev.payload).toEqual({ efectivoContado: 0, denominaciones: [] });
  });

  it('limita las observaciones a 1000 caracteres', () => {
    expect(evaluarCierre({ ...base, contadoTexto: '520.000', observaciones: 'x'.repeat(1001) }).error).toMatch(/máximo 1000/);
  });
});

describe('cobros y reembolsos', () => {
  const cash = { id: 'cash', nombre: 'Caja menor', codigo: 'otro', esEfectivo: true };
  const nequi = { id: 'nequi', nombre: 'Nequi', codigo: 'nequi', esEfectivo: false };

  it('el recibido es opcional y solo aplica al efectivo', () => {
    expect(evaluarCobro(cash, 30000, '')).toEqual({ esEfectivo: true, cambio: null, error: null });
    expect(evaluarCobro(nequi, 30000, '50.000')).toEqual({ esEfectivo: false, cambio: null, error: null });
    expect(evaluarCobro(undefined, 30000, '50.000').esEfectivo).toBe(false);
  });

  it('calcula el cambio y rechaza un recibido menor al monto', () => {
    expect(evaluarCobro(cash, 30000, '50.000')).toEqual({ esEfectivo: true, montoRecibido: 50000, cambio: 20000, error: null });
    expect(evaluarCobro(cash, 30000, '20.000').error).toBe('El monto recibido debe cubrir el valor a cobrar.');
    expect(evaluarCobro(cash, 30000, '1.2.3').error).toBe('Monto recibido inválido.');
  });

  it('sin `esEfectivo` cae al código o al nombre (backend anterior)', () => {
    expect(evaluarCobro({ id: 'a', nombre: 'Contado', codigo: 'efectivo' }, 1, '').esEfectivo).toBe(true);
    expect(evaluarCobro({ id: 'b', nombre: 'Efectivo caja 2', codigo: 'x' }, 1, '').esEfectivo).toBe(true);
    expect(evaluarCobro({ id: 'c', nombre: 'Efectivo', codigo: 'efectivo', esEfectivo: false }, 1, '').esEfectivo).toBe(false);
  });

  it('arma los campos del cobro solo con lo que aplica', () => {
    expect(cobroPayload('', evaluarCobro(undefined, 1, ''))).toEqual({});
    expect(cobroPayload('nequi', evaluarCobro(nequi, 1, '5'))).toEqual({ metodoPagoId: 'nequi' });
    expect(cobroPayload('cash', evaluarCobro(cash, 1000, '2.000'))).toEqual({ metodoPagoId: 'cash', montoRecibido: 2000 });
  });

  it('reembolso opcional: sin monto no hay reembolso; con monto exige método y tope', () => {
    expect(evaluarReembolso('', '')).toEqual({ error: null });
    expect(evaluarReembolso('cash', '0').error).toBe('Monto de reembolso inválido.');
    expect(evaluarReembolso('cash', '30.000', 20000).error).toBe('El reembolso supera lo que se puede devolver.');
    expect(evaluarReembolso('', '10.000', 20000).error).toBe('Selecciona el método del reembolso.');
    expect(evaluarReembolso('cash', '20.000', 20000)).toEqual({ reembolso: { metodoPagoId: 'cash', monto: 20000 }, error: null });
    expect(evaluarReembolso('cash', '99.000')).toEqual({ reembolso: { metodoPagoId: 'cash', monto: 99000 }, error: null });
  });

  it('descarta los métodos que el backend no acepta para mover dinero', () => {
    expect(metodosDeCaja([cash, nequi, { id: 'c', nombre: 'Crédito', codigo: 'credito' }, { id: 's', nombre: 'Separado', codigo: 'separado' }]).map((m) => m.id)).toEqual(['cash', 'nequi']);
  });
});
