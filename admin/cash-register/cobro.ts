import { esMetodoEfectivo } from "@/admin/sales/constants/metodos-pago";
import { parseMonto } from "@/core/utils/money";

/** Método elegible para un cobro o reembolso. */
export type MetodoCobro = {
  id: string;
  nombre: string;
  codigo?: string;
  esEfectivo?: boolean;
};

/** Códigos que el backend rechaza para mover dinero de caja. */
const NO_MUEVEN_DINERO = new Set(["credito", "separado"]);

export function metodosDeCaja<T extends MetodoCobro>(metodos: T[]): T[] {
  return metodos.filter((m) => !NO_MUEVEN_DINERO.has(m.codigo ?? ""));
}

export type CobroEvaluado = {
  esEfectivo: boolean;
  /** Efectivo entregado por el cliente, si lo indicó y el método es efectivo. */
  montoRecibido?: number;
  /** Vuelto a entregar; `null` si no aplica. */
  cambio: number | null;
  error: string | null;
};

/**
 * Efectivo recibido y cambio de un cobro. El recibido es opcional; si se escribe
 * debe cubrir el monto aplicado. En métodos que no son efectivo se ignora.
 */
export function evaluarCobro(
  metodo: MetodoCobro | undefined,
  monto: number,
  recibidoTexto: string,
): CobroEvaluado {
  const esEfectivo = esMetodoEfectivo(metodo);
  if (!esEfectivo || recibidoTexto.trim() === "")
    return { esEfectivo, cambio: null, error: null };
  const recibido = parseMonto(recibidoTexto);
  if (!Number.isFinite(recibido))
    return { esEfectivo, cambio: null, error: "Monto recibido inválido." };
  if (Number.isFinite(monto) && recibido < monto)
    return {
      esEfectivo,
      cambio: null,
      error: "El monto recibido debe cubrir el valor a cobrar.",
    };
  return {
    esEfectivo,
    montoRecibido: recibido,
    cambio: Number.isFinite(monto)
      ? Math.round((recibido - monto) * 100) / 100
      : null,
    error: null,
  };
}

/** Campos `metodoPagoId` / `montoRecibido` que se añaden al cuerpo de un cobro. */
export function cobroPayload(
  metodoPagoId: string,
  cobro: CobroEvaluado,
): { metodoPagoId?: string; montoRecibido?: number } {
  if (!metodoPagoId) return {};
  return {
    metodoPagoId,
    ...(cobro.montoRecibido != null
      ? { montoRecibido: cobro.montoRecibido }
      : {}),
  };
}

export type Reembolso = { metodoPagoId: string; monto: number };

export type ReembolsoEvaluado = {
  /** Presente solo si se indicó un reembolso válido. */
  reembolso?: Reembolso;
  error: string | null;
};

/**
 * Reembolso opcional al cliente: sin monto no se devuelve dinero. Con monto exige
 * método y respeta el tope (`maximo`) cuando se conoce.
 */
export function evaluarReembolso(
  metodoPagoId: string,
  montoTexto: string,
  maximo?: number,
): ReembolsoEvaluado {
  if (montoTexto.trim() === "") return { error: null };
  const monto = parseMonto(montoTexto);
  if (!(monto > 0)) return { error: "Monto de reembolso inválido." };
  if (maximo != null && monto > maximo)
    return { error: "El reembolso supera lo que se puede devolver." };
  if (!metodoPagoId) return { error: "Selecciona el método del reembolso." };
  return { reembolso: { metodoPagoId, monto }, error: null };
}
