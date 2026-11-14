import { describe, expect, it } from 'vitest';

import { formatCurrency, formatDateLabel, formatNumber } from './format';
import { getAlmacenPredeterminado } from './utils/almacen';

describe('formato es-CO', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1000, '1.000'],
    [1234567, '1.234.567'],
    [1500.5, '1.501'],
    [-25000, '-25.000'],
  ])('formatNumber(%d) → %s', (n, expected) => {
    expect(formatNumber(n)).toBe(expected);
  });

  it('formatCurrency antepone el símbolo', () => {
    expect(formatCurrency(50000)).toBe('$50.000');
    expect(formatCurrency(50000, 'COP ')).toBe('COP 50.000');
  });

  it('formatDateLabel muestra dd/mm/aaaa sin desfase de zona horaria', () => {
    expect(formatDateLabel('2026-01-05')).toMatch(/^05\/01\/2026$/);
    expect(formatDateLabel('2026-12-31T23:59:59.000Z')).toMatch(/^31\/12\/2026$/);
    expect(formatDateLabel('no-fecha')).toBe('no-fecha');
  });
});

describe('getAlmacenPredeterminado', () => {
  it('prioriza activos y ordena por código', () => {
    const a = [
      { id: '3', codigo: 'C', activo: true },
      { id: '1', codigo: 'A', activo: false },
      { id: '2', codigo: 'B', activo: true },
    ];
    expect(getAlmacenPredeterminado(a)?.id).toBe('2');
  });

  it('si ninguno está activo usa el primero por código; vacío → null', () => {
    expect(getAlmacenPredeterminado([{ id: 'z', codigo: 'Z', activo: false }, { id: 'y', codigo: 'Y', activo: false }])?.id).toBe('y');
    expect(getAlmacenPredeterminado([])).toBeNull();
    expect(getAlmacenPredeterminado(undefined)).toBeNull();
  });
});
