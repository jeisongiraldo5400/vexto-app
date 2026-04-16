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
