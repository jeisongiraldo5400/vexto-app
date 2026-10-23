/**
 * Montos en formato colombiano (es-CO): "." separa miles y "," separa decimales.
 *
 * Todas las funciones devuelven `NaN` cuando el texto está vacío o no es un monto
 * válido, igual que `Number()`, para que la validación sea `Number.isFinite(x)`.
 */

const THOUSANDS = /^[1-9]\d{0,2}(\.\d{3})+$/;
const PLAIN_INT = /^\d+$/;

function parseIntegerPart(raw: string): number {
  if (PLAIN_INT.test(raw)) return Number(raw);
  if (THOUSANDS.test(raw)) return Number(raw.replace(/\./g, ''));
  return Number.NaN;
}

/**
 * - `"50.000"` → 50000, `"1.500,50"` → 1500.5, `"1500"` → 1500, `"1,"` → 1.
 * - Sin coma, un único punto que no forma grupos de miles se toma como decimal
 *   (`"1500.5"`), para tolerar valores precargados con `String(n)` y teclados en inglés.
 * - Vacío, negativo o inválido → `NaN`.
 */
export function parseMonto(input: string | null | undefined): number {
  const raw = (input ?? '').replace(/[\s$]/g, '');
  if (!raw) return Number.NaN;

  const commaParts = raw.split(',');
  if (commaParts.length > 2) return Number.NaN;

  if (commaParts.length === 2) {
    const [intPart, decPart] = commaParts;
    if (!intPart || !/^\d*$/.test(decPart)) return Number.NaN;
    const int = parseIntegerPart(intPart);
    if (!Number.isFinite(int)) return Number.NaN;
    return decPart ? Number(`${int}.${decPart}`) : int;
  }

  if (PLAIN_INT.test(raw)) return Number(raw);
  if (THOUSANDS.test(raw)) return Number(raw.replace(/\./g, ''));
  if (/^\d+\.\d+$/.test(raw)) return Number(raw);
  return Number.NaN;
}

/** Cantidad entera positiva o cero. Acepta miles con punto ("1.000"). Vacío/decimal → `NaN`. */
export function parseCantidad(input: string | null | undefined): number {
  const raw = (input ?? '').trim();
  if (!raw) return Number.NaN;
  return parseIntegerPart(raw);
}

/** Número → texto editable es-CO (`1500.5` → `"1.500,5"`). `NaN` → `""`. */
export function formatMontoInput(n: number): string {
  if (!Number.isFinite(n)) return '';
  const [int, dec] = String(Math.round(n * 100) / 100).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return dec ? `${grouped},${dec}` : grouped;
}

/** Deja solo dígitos, "." y ","; conserva estados intermedios como `"1,"` o `""`. */
export function sanitizeMontoInput(text: string): string {
  return text.replace(/[^\d.,]/g, '');
}

/** Solo dígitos (cantidades enteras); permite `""` mientras se escribe. */
export function sanitizeCantidadInput(text: string): string {
  return text.replace(/\D/g, '');
}
