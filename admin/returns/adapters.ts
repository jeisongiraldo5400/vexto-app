import { apiFetch } from "@/core/http/api";
import { postIdempotent } from "@/core/http/idempotent";

export type DevolucionItem = {
  productoId: string;
  productoNombre?: string | null;
  productoCodigo?: string | null;
  cantidad: number;
  precioUnitario?: number;
};

export type Devolucion = {
  id: string;
  numeroDevolucion?: string;
  tipo: "cliente" | "proveedor" | string;
  ventaId: string | null;
  clienteNombre?: string | null;
  proveedorNombre?: string | null;
  almacenId: string;
  almacenNombre?: string | null;
  motivo: string | null;
  /** `registrada` | `anulada`. */
  estado: string;
  total: number;
  items: DevolucionItem[];
  createdAt?: string;
};

export type VentaParaDevolucion = {
  id: string;
  numeroFactura: string;
  clienteNombre: string;
  almacenId: string;
  almacenNombre: string;
  estado: string;
  items: {
    productoId: string;
    productoNombre: string;
    productoCodigo: string;
    cantidad: number;
    cantidadYaDevuelta: number;
    cantidadPendienteDevolver: number;
  }[];
};

export const DEVOLUCIONES_PAGE_SIZE = 20;

export const ESTADO_DEVOLUCION_LABEL: Record<string, string> = {
  registrada: "Registrada",
  anulada: "Anulada",
};

export const TIPO_DEVOLUCION_FILTROS = [
  { value: "", label: "Todas" },
  { value: "cliente", label: "De clientes" },
  { value: "proveedor", label: "A proveedores" },
];

const num = (v: unknown) => Number(v ?? 0) || 0;

function toDevolucion(raw: Devolucion): Devolucion {
  const items = (raw.items ?? []).map((i) => ({
    ...i,
    cantidad: num(i.cantidad),
    precioUnitario:
      i.precioUnitario == null ? undefined : num(i.precioUnitario),
  }));
  return { ...raw, total: num(raw.total), items };
}

export async function fetchDevoluciones(tipo: string, pagina = 1) {
  const q = new URLSearchParams({
    pagina: String(pagina),
    limite: String(DEVOLUCIONES_PAGE_SIZE),
  });
  if (tipo) q.set("tipo", tipo);
  const data = await apiFetch<
    { devoluciones: Devolucion[]; total: number } | Devolucion[]
  >(`devoluciones?${q.toString()}`);
  const page = Array.isArray(data)
    ? { devoluciones: data, total: data.length }
    : data;
  return {
    devoluciones: (page.devoluciones ?? []).map(toDevolucion),
    total: page.total ?? 0,
  };
}

export async function fetchDevolucion(id: string) {
  return toDevolucion(await apiFetch<Devolucion>(`devoluciones/${id}`));
}

export async function cargarVentaParaDevolucion(numeroFactura: string) {
  const raw = await apiFetch<VentaParaDevolucion>(
    `devoluciones/cliente/cargar-venta?numeroFactura=${encodeURIComponent(numeroFactura.trim())}`,
  );
  return {
    ...raw,
    items: (raw.items ?? []).map((i) => ({
      ...i,
      cantidad: num(i.cantidad),
      cantidadYaDevuelta: num(i.cantidadYaDevuelta),
      cantidadPendienteDevolver: num(i.cantidadPendienteDevolver),
    })),
  };
}

export type CrearDevolucionClientePayload = {
  ventaId: string;
  almacenId: string;
  items: { productoId: string; cantidad: number }[];
  motivo?: string;
  /** Dinero devuelto al cliente; con el módulo caja sale de la caja de quien registra. */
  reembolso?: { metodoPagoId: string; monto: number };
};

export function crearDevolucionCliente(
  body: CrearDevolucionClientePayload,
  intent?: string,
) {
  return postIdempotent<Devolucion>("devoluciones/cliente", body, intent);
}

export function anularDevolucion(id: string) {
  return apiFetch<void>(`devoluciones/${id}/anular`, {
    method: "POST",
    body: {},
  });
}
