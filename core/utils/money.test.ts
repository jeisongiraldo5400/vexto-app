import { describe, expect, it } from 'vitest';

import { formatMontoInput, parseCantidad, parseMonto, sanitizeMontoInput } from './money';

describe('parseMonto (es-CO)', () => {
  it.each([
    ['50.000', 50000],
    ['1.500,50', 1500.5],
    ['1.500.000', 1500000],
    ['1500', 1500],
    ['1500,5', 1500.5],
    ['0,75', 0.75],
    ['  $ 50.000 ', 50000],
    ['1,', 1],
    ['1500.5', 1500.5],
    ['33333.33', 33333.33],
    ['0.125', 0.125],
    ['0', 0],
  ])('%s → %d', (raw, expected) => {
    expect(parseMonto(raw)).toBe(expected);
  });

  it.each(['', '   ', 'abc', '1.50.0', '1,5,0', '12a', '-5', '1.500.5', ','])(
    '%j es inválido (NaN)',
    (raw) => {
      expect(parseMonto(raw)).toBeNaN();
    },
  );
});

describe('parseCantidad', () => {
  it.each([
    ['1', 1],
    ['12', 12],
    [' 3 ', 3],
    ['1.000', 1000],
  ])('%s → %d', (raw, expected) => {
    expect(parseCantidad(raw)).toBe(expected);
  });

  it.each(['', '1,5', '1.5', 'x', '-1'])('%j es inválido (NaN)', (raw) => {
    expect(parseCantidad(raw)).toBeNaN();
  });
});

describe('formatMontoInput / sanitizeMontoInput', () => {
  it('formatea con miles y decimales colombianos y vuelve a parsear igual', () => {
    expect(formatMontoInput(50000)).toBe('50.000');
    expect(formatMontoInput(1500.5)).toBe('1.500,5');
    expect(formatMontoInput(33333.33)).toBe('33.333,33');
    expect(formatMontoInput(0)).toBe('0');
    for (const n of [50000, 1500.5, 33333.33, 0.75, 1234567.89]) {
      expect(parseMonto(formatMontoInput(n))).toBe(n);
    }
  });
  it('vacío o NaN se formatean como cadena vacía', () => {
    expect(formatMontoInput(Number.NaN)).toBe('');
  });
  it('conserva texto parcial mientras se escribe y quita caracteres ajenos', () => {
    expect(sanitizeMontoInput('1,')).toBe('1,');
    expect(sanitizeMontoInput('')).toBe('');
    expect(sanitizeMontoInput('$ 1.5a0')).toBe('1.50');
  });
});
