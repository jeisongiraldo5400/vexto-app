import { apiFetch } from "@/core/http/api";
import { postIdempotent } from "@/core/http/idempotent";

export type Pago = {
  id: string;
  ventaId: string | null;
  creditoId: string | null;
  clienteNombre: string | null;
  numeroFactura: string;
  monto: number;
  metodoPagoNombre?: string;
  estado: string;
  referencia?: string | null;
  fechaPago?: string;
  createdAt?: string;
  usuarioNombre?: string;
};

export type VentaPagable = {
  id: string;
  numeroFactura: string;
  clienteNombre?: string | null;
  total: number;
  estado?: string;
  saldoPendiente?: number | null;
};

export const PAGOS_PAGE_SIZE = 20;

export const ESTADO_PAGO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  completado: "Completado",
  parcial: "Parcial",
  cancelado: "Cancelado",
};

export const ESTADO_PAGO_FILTROS = [
  { value: "", label: "Todos" },
  { value: "completado", label: "Completados" },
  { value: "pendiente", label: "Pendientes" },
  { value: "cancelado", label: "Cancelados" },
];

const num = (v: unknown) => Number(v ?? 0) || 0;

export async function fetchPagos(estado: string, pagina = 1) {
  const q = new URLSearchParams({
    pagina: String(pagina),
    limite: String(PAGOS_PAGE_SIZE),
  });
  if (estado) q.set("estado", estado);
  const data = await apiFetch<{ pagos: Pago[]; total: number } | Pago[]>(
    `pagos?${q.toString()}`,
  );
  const page = Array.isArray(data) ? { pagos: data, total: data.length } : data;
  return {
    pagos: (page.pagos ?? []).map((p) => ({ ...p, monto: num(p.monto) })),
    total: page.total ?? 0,
  };
}

/** Estados de pago que ya abonaron a la venta. */
const ABONADOS = new Set(["completado", "parcial"]);

/**
 * Saldo de una venta: `saldoPendiente` del backend (ventas a crédito) o total
 * menos los pagos ya abonados.
 */
export function calcularSaldoVenta(
  venta: Pick<VentaPagable, "total" | "saldoPendiente">,
  pagos: Pick<Pago, "monto" | "estado">[] = [],
) {
  if (venta.saldoPendiente != null) return Math.max(0, num(venta.saldoPendiente));
  const pagado = pagos
    .filter((p) => ABONADOS.has(p.estado?.toLowerCase()))
    .reduce((acc, p) => acc + num(p.monto), 0);
  return Math.max(0, Math.round((num(venta.total) - pagado) * 100) / 100);
}

/** Busca la venta por número de factura y calcula su saldo pendiente. */
export async function fetchVentaPagable(numeroFactura: string) {
  const venta = await apiFetch<VentaPagable>(
    `ventas/numero/${encodeURIComponent(numeroFactura.trim())}`,
  );
  const pagos =
    venta.saldoPendiente == null
      ? // Sin pagos no hay saldo confiable: el error se propaga en vez de asumir el total.
        await apiFetch<Pago[]>(`pagos/venta/${venta.id}`)
      : [];
  return {
    venta: { ...venta, total: num(venta.total) },
    saldo: calcularSaldoVenta(venta, pagos ?? []),
  };
}

export type CrearPagoPayload = {
  ventaId: string;
  monto: number;
  metodoPagoId: string;
  referencia?: string;
  observaciones?: string;
};

export function crearPago(body: CrearPagoPayload, intent?: string) {
  return postIdempotent<Pago>("pagos", body, intent);
}
