export const METODO_CREDITO_INTERNO = 'credito';

export function esCreditoInterno(codigo?: string): boolean {
  return codigo === METODO_CREDITO_INTERNO;
}

/** Financieras externas — pago inmediato en cobro normal */
const METODOS_FINANCIERA = ['sistecredito', 'addi', 'krediya', 'celya', 'alocredit'] as const;

export function esMetodoPagoCredito(codigo?: string): boolean {
  return esCreditoInterno(codigo) || METODOS_FINANCIERA.includes(codigo as (typeof METODOS_FINANCIERA)[number]);
}
