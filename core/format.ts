/**
 * Formatea un número con separador de miles (punto).
 * Ej.: 1234567 → "1.234.567"
 */
export function formatNumber(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Formatea un número como moneda con símbolo.
 * Ej.: 1234567 → "$1.234.567"
 */
export function formatCurrency(n: number, symbol = '$'): string {
  return `${symbol}${formatNumber(n)}`;
}

/** Fecha de negocio (YYYY-MM-DD o ISO) → dd/mm/yyyy (es-CO). */
export function formatDateLabel(isoOrYmd: string): string {
  const ymd = isoOrYmd.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return isoOrYmd;

  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(date.getTime())) return isoOrYmd;

  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
