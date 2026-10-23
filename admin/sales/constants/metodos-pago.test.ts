import { describe, expect, it } from 'vitest';

import { esCreditoInterno, esMetodoPagoCredito } from './metodos-pago';

describe('métodos de pago a crédito', () => {
  it('reconoce el crédito interno', () => {
    expect(esCreditoInterno('credito')).toBe(true);
    expect(esCreditoInterno('efectivo')).toBe(false);
    expect(esCreditoInterno(undefined)).toBe(false);
  });

  it.each(['credito', 'sistecredito', 'addi', 'krediya', 'celya', 'alocredit'])('%s es método de crédito', (c) => {
    expect(esMetodoPagoCredito(c)).toBe(true);
  });

  it.each(['efectivo', 'tarjeta', '', undefined])('%j no es método de crédito', (c) => {
    expect(esMetodoPagoCredito(c)).toBe(false);
  });
});
