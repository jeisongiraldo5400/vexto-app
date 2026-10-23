import { apiFetch } from "@/core/http/api";
import { postIdempotent } from "@/core/http/idempotent";
import { toLocalYmd } from "@/core/utils/date";

/** Estados del backend: `pendiente` (activo), `entregado` (retirado), `cancelado`. */
export type EstadoSeparado = "pendiente" | "entregado" | "cancelado" | string;

export type SeparadoItem = {
  productoId: string;
  productoNombre?: string | null;
  cantidad: number;
  precioUnitario?: number;
  subtotal?: number;
};

export type Separado = {
  id: string;
  numeroSeparado?: string;
  clienteId: string;
  clienteNombre?: string | null;
  almacenId: string;
  almacenNombre?: string | null;
  anticipo: number;
  total: number;
  saldoPendiente: number;
  estado: EstadoSeparado;
  fechaLimiteRetiro: string;
  observacionesCancelacion?: string | null;
  canceladoAt?: string | null;
  items: SeparadoItem[];
  createdAt?: string;
};

export type SeparadosPage = { separados: Separado[]; total: number };

export const SEPARADOS_PAGE_SIZE = 20;

export const ESTADO_SEPARADO_LABEL: Record<string, string> = {
  pendiente: "Activo",
  entregado: "Retirado",
  cancelado: "Cancelado",
};

export const ESTADO_SEPARADO_FILTROS = [
  { value: "", label: "Todos" },
  { value: "pendiente", label: "Activos" },
  { value: "entregado", label: "Retirados" },
  { value: "cancelado", label: "Cancelados" },
];

/** Mínimo de caracteres del motivo de cancelación (validación del backend). */
export const MIN_OBSERVACIONES_CANCELACION = 5;

const num = (v: unknown) => Number(v ?? 0) || 0;

/** Los montos pueden llegar como string decimal (`"1500.00"`). */
export function toSeparado(raw: Separado): Separado {
  return {
    ...raw,
    anticipo: num(raw.anticipo),
    total: num(raw.total),
    saldoPendiente: num(raw.saldoPendiente),
    items: (raw.items ?? []).map((i) => ({
      ...i,
      cantidad: num(i.cantidad),
      precioUnitario:
        i.precioUnitario == null ? undefined : num(i.precioUnitario),
      subtotal: i.subtotal == null ? undefined : num(i.subtotal),
    })),
  };
}

export async function fetchSeparados(estado: string, pagina = 1) {
  const q = new URLSearchParams({
    pagina: String(pagina),
    limite: String(SEPARADOS_PAGE_SIZE),
  });
  if (estado) q.set("estado", estado);
  const data = await apiFetch<SeparadosPage>(`separados?${q.toString()}`);
  return {
    separados: (data.separados ?? []).map(toSeparado),
    total: data.total ?? 0,
  };
}

export async function fetchSeparado(id: string) {
  return toSeparado(await apiFetch<Separado>(`separados/${id}`));
}

export type CrearSeparadoPayload = {
  clienteId: string;
  almacenId: string;
  items: { productoId: string; cantidad: number }[];
  anticipo: number;
  /** `YYYY-MM-DD`, posterior a hoy. */
  fechaLimiteRetiro: string;
};

export function crearSeparado(body: CrearSeparadoPayload, intent?: string) {
  return postIdempotent<Separado>("separados", body, intent);
}

/** Abono al saldo. `intent` separa dos abonos reales del mismo monto. */
export function abonarSeparado(id: string, monto: number, intent?: string) {
  return postIdempotent<Separado>(`separados/${id}/abonar`, { monto }, intent);
}

export function cancelarSeparado(id: string, observaciones: string) {
  return apiFetch<Separado>(`separados/${id}/cancelar`, {
    method: "POST",
    body: { observaciones: observaciones.trim() },
  });
}

export function retirarSeparado(id: string) {
  return apiFetch<Separado>(`separados/${id}/retirar`, {
    method: "POST",
    body: {},
  });
}

/** Fecha por defecto para el retiro: hoy + `dias`. */
export function fechaRetiroPorDefecto(dias = 7, hoy = new Date()) {
  const d = new Date(hoy);
  d.setDate(d.getDate() + dias);
  return toLocalYmd(d);
}

/** `YYYY-MM-DD` válido y posterior a hoy. */
export function esFechaRetiroValida(ymd: string, hoy = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  )
    return false;
  return ymd > toLocalYmd(hoy);
}
