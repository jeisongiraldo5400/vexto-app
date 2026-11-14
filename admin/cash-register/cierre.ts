import { formatCurrency } from "@/core/format";
import { parseCantidad, parseMonto } from "@/core/utils/money";

import type { CerrarCajaPayload, Denominacion } from "./adapters";

/** Billetes y monedas colombianos en circulación, de mayor a menor. */
export const DENOMINACIONES_COP: { valor: number; tipo: "billete" | "moneda" }[] =
  [
    { valor: 100000, tipo: "billete" },
    { valor: 50000, tipo: "billete" },
    { valor: 20000, tipo: "billete" },
    { valor: 10000, tipo: "billete" },
    { valor: 5000, tipo: "billete" },
    { valor: 2000, tipo: "billete" },
    { valor: 1000, tipo: "moneda" },
    { valor: 500, tipo: "moneda" },
    { valor: 200, tipo: "moneda" },
    { valor: 100, tipo: "moneda" },
    { valor: 50, tipo: "moneda" },
  ];

/** Cantidades escritas por denominación (`valor` → texto crudo del campo). */
export type ConteoDenominaciones = Record<number, string>;

export const MAX_OBSERVACIONES_CIERRE = 1000;

const centavos = (n: number) => Math.round(n * 100);

/** Cantidad válida de una denominación; vacío cuenta como 0, inválido como `NaN`. */
function cantidadDe(texto: string | undefined): number {
  return (texto ?? "").trim() === "" ? 0 : parseCantidad(texto);
}

/** Conteo → líneas con cantidad mayor a 0 (lo que se envía al backend). */
export function denominacionesPayload(
  conteo: ConteoDenominaciones,
): Denominacion[] {
  return DENOMINACIONES_COP.map(({ valor }) => ({
    valor,
    cantidad: cantidadDe(conteo[valor]),
  })).filter((d) => d.cantidad > 0);
}

/** Σ valor × cantidad. `NaN` si alguna cantidad no es un entero válido. */
export function totalDenominaciones(conteo: ConteoDenominaciones): number {
  let total = 0;
  for (const { valor } of DENOMINACIONES_COP) {
    const cantidad = cantidadDe(conteo[valor]);
    if (!Number.isFinite(cantidad)) return Number.NaN;
    total += valor * cantidad;
  }
  return total;
}

export type TipoDiferencia = "cuadrada" | "sobrante" | "faltante";

/** contado − esperado en pesos, sin ruido de coma flotante. */
export function calcularDiferencia(esperado: number, contado: number): number {
  return (centavos(contado) - centavos(esperado)) / 100;
}

export function tipoDiferencia(diferencia: number): TipoDiferencia {
  return diferencia === 0 ? "cuadrada" : diferencia > 0 ? "sobrante" : "faltante";
}

/** "Caja cuadrada" / "Sobrante $5.000" / "Faltante $20.000". */
export function etiquetaDiferencia(diferencia: number): string {
  const tipo = tipoDiferencia(diferencia);
  if (tipo === "cuadrada") return "Caja cuadrada";
  return `${tipo === "sobrante" ? "Sobrante" : "Faltante"} ${formatCurrency(Math.abs(diferencia))}`;
}

export type EvaluacionCierre = {
  /** Efectivo contado; `NaN` mientras no sea un monto válido. */
  contado: number;
  diferencia: number | null;
  tipo: TipoDiferencia | null;
  requiereObservaciones: boolean;
  error: string | null;
  /** Presente solo cuando el cierre es válido. */
  payload?: CerrarCajaPayload;
};

/**
 * Valida el arqueo antes de enviarlo con las mismas reglas del backend: con
 * `usarDenominaciones` el contado es la suma del conteo, y cualquier diferencia
 * exige observaciones.
 */
export function evaluarCierre(input: {
  esperado: number;
  contadoTexto: string;
  usarDenominaciones: boolean;
  conteo: ConteoDenominaciones;
  observaciones: string;
}): EvaluacionCierre {
  const contado = input.usarDenominaciones
    ? totalDenominaciones(input.conteo)
    : parseMonto(input.contadoTexto);
  const vacio = input.usarDenominaciones
    ? Object.values(input.conteo).every((t) => (t ?? "").trim() === "")
    : input.contadoTexto.trim() === "";
  if (!Number.isFinite(contado) || contado < 0 || vacio) {
    return {
      contado: Number.NaN,
      diferencia: null,
      tipo: null,
      requiereObservaciones: false,
      error: vacio
        ? input.usarDenominaciones
          ? "Cuenta los billetes y monedas (usa 0 si la caja está vacía)."
          : "Indica el efectivo contado."
        : input.usarDenominaciones
          ? "Las cantidades deben ser números enteros."
          : "Efectivo contado inválido.",
    };
  }

  const diferencia = calcularDiferencia(input.esperado, contado);
  const tipo = tipoDiferencia(diferencia);
  const observaciones = input.observaciones.trim();
  const requiereObservaciones = diferencia !== 0;
  const error =
    requiereObservaciones && !observaciones
      ? "Explica la diferencia en las observaciones."
      : observaciones.length > MAX_OBSERVACIONES_CIERRE
        ? `Las observaciones admiten máximo ${MAX_OBSERVACIONES_CIERRE} caracteres.`
        : null;

  return {
    contado,
    diferencia,
    tipo,
    requiereObservaciones,
    error,
    payload: error
      ? undefined
      : {
          efectivoContado: contado,
          ...(input.usarDenominaciones
            ? { denominaciones: denominacionesPayload(input.conteo) }
            : {}),
          ...(observaciones ? { observaciones } : {}),
        },
  };
}
