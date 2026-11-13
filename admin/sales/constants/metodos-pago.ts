export const METODO_CREDITO_INTERNO = 'credito';

export function esCreditoInterno(codigo?: string): boolean {
  return codigo === METODO_CREDITO_INTERNO;
}

/** Financieras externas — pago inmediato en cobro normal */
const METODOS_FINANCIERA = ['sistecredito', 'addi', 'krediya', 'celya', 'alocredit'] as const;

export function esMetodoPagoCredito(codigo?: string): boolean {
  return esCreditoInterno(codigo) || METODOS_FINANCIERA.includes(codigo as (typeof METODOS_FINANCIERA)[number]);
}

/**
 * ¿El método mueve efectivo? Manda `esEfectivo` de la API; si no viene (backend
 * anterior), se deduce del código o del nombre como antes.
 */
export function esMetodoEfectivo(
  metodo?: { codigo?: string; nombre?: string; esEfectivo?: boolean } | null,
): boolean {
  if (!metodo) return false;
  if (typeof metodo.esEfectivo === 'boolean') return metodo.esEfectivo;
  return metodo.codigo === 'efectivo' || !!metodo.nombre?.toLowerCase().includes('efectivo');
}

/**
 * Métodos con los que se cobra la cuota inicial de un crédito: activos, sin el
 * crédito propio (no se paga crédito con crédito) ni el método interno de separados.
 */
export function metodosCuotaInicial<T extends { codigo?: string; estado?: string }>(
  metodos: T[],
): T[] {
  return metodos.filter(
    (m) => m.estado !== 'inactivo' && !esCreditoInterno(m.codigo) && m.codigo !== 'separado',
  );
}
