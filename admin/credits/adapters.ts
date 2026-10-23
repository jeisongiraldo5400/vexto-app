import { apiFetch } from "@/core/http/api";
import { postIdempotent } from "@/core/http/idempotent";

export type EstadoCredito = "pendiente" | "parcial" | "pagado" | "cancelado";

export type CreditoCuota = {
  id?: string;
  numero: number;
  monto: number;
  saldoPendiente: number;
  fechaVencimiento: string;
  estado: string;
};

export type Credito = {
  id: string;
  ventaId: string;
  clienteId: string;
  clienteNombre: string;
  numeroFactura: string;
  montoTotal: number;
  /** Saldo financiado pendiente (cuotas 1..N). */
  saldoPendiente: number;
  /** Total pendiente (todas las cuotas, incluida la inicial en créditos antiguos). */
  saldoPendienteTotal?: number;
  estado: EstadoCredito;
  fechaVencimiento: string | null;
  numeroCuotas?: number | null;
  frecuencia?: string | null;
  cuotaInicial?: number | null;
  createdAt?: string;
};

export type CreditoDetalle = Credito & {
  cuotas?: CreditoCuota[];
  items?: {
    productoId: string;
    productoNombre: string;
    cantidad: number;
    precioUnitario: number;
    total: number;
  }[];
};

export type PagoCredito = {
  id: string;
  creditoId: string | null;
  monto: number;
  metodoPagoNombre?: string;
  estado: string;
  fechaPago?: string;
  createdAt?: string;
};

export const CREDITOS_PAGE_SIZE = 20;

export const ESTADO_CREDITO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  parcial: "Parcial",
  pagado: "Pagado",
  cancelado: "Cancelado",
};

export const ESTADO_CREDITO_FILTROS = [
  { value: "", label: "Todos" },
  { value: "pendiente", label: "Pendientes" },
  { value: "parcial", label: "Parciales" },
  { value: "pagado", label: "Pagados" },
  { value: "cancelado", label: "Cancelados" },
];

const num = (v: unknown) => Number(v ?? 0) || 0;

export function toCredito<T extends Credito>(raw: T): T {
  return {
    ...raw,
    montoTotal: num(raw.montoTotal),
    saldoPendiente: num(raw.saldoPendiente),
    saldoPendienteTotal:
      raw.saldoPendienteTotal == null ? undefined : num(raw.saldoPendienteTotal),
    cuotaInicial: raw.cuotaInicial == null ? null : num(raw.cuotaInicial),
  };
}

/** Lo que falta por pagar (mismo criterio que el abono en la web). */
export function saldoTotal(c: Pick<Credito, "saldoPendiente" | "saldoPendienteTotal">) {
  return c.saldoPendienteTotal ?? c.saldoPendiente;
}

export function puedeAbonar(c: Pick<Credito, "estado">) {
  return c.estado === "pendiente" || c.estado === "parcial";
}

export async function fetchCreditos(estado: string, pagina = 1) {
  const q = new URLSearchParams({
    pagina: String(pagina),
    limite: String(CREDITOS_PAGE_SIZE),
  });
  if (estado) q.set("estado", estado);
  const data = await apiFetch<{ creditos: Credito[]; total: number }>(
    `creditos?${q.toString()}`,
  );
  return {
    creditos: (data.creditos ?? []).map(toCredito),
    total: data.total ?? 0,
  };
}

export async function fetchCredito(id: string) {
  const raw = await apiFetch<CreditoDetalle>(`creditos/${id}`);
  const c = toCredito(raw);
  return {
    ...c,
    cuotas: (raw.cuotas ?? []).map((q) => ({
      ...q,
      monto: num(q.monto),
      saldoPendiente: num(q.saldoPendiente),
    })),
  };
}

/** Pagos de la venta del crédito; se filtran los abonos a este crédito. */
export async function fetchAbonosCredito(ventaId: string, creditoId: string) {
  const pagos = await apiFetch<PagoCredito[]>(`pagos/venta/${ventaId}`);
  return (pagos ?? [])
    .filter((p) => p.creditoId === creditoId)
    .map((p) => ({ ...p, monto: num(p.monto) }));
}

export type AbonoCreditoPayload = {
  ventaId: string;
  creditoId: string;
  monto: number;
  metodoPagoId: string;
  observaciones?: string;
};

export type AbonoCreditoResponse = {
  id: string;
  creditoLiquidado?: boolean;
};

/** Abono a crédito: `POST /pagos` con `Idempotency-Key`. */
export function registrarAbonoCredito(
  body: AbonoCreditoPayload,
  intent?: string,
) {
  return postIdempotent<AbonoCreditoResponse>("pagos", body, intent);
}
