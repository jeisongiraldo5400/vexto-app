/** Códigos que exigen cliente en la venta (alineado con vexto-frontend POS). */
const METODOS_PAGO_CREDITO = [
  'credito',
  'sistecredito',
  'addi',
  'krediya',
  'celya',
  'alocredit',
] as const;

export function esMetodoPagoCredito(codigo?: string): boolean {
  return !!codigo && METODOS_PAGO_CREDITO.includes(codigo as (typeof METODOS_PAGO_CREDITO)[number]);
}
