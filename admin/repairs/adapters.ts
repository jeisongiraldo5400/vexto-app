import { apiFetch } from "@/core/http/api";
import { postIdempotent } from "@/core/http/idempotent";

export type RepairOrder = {
  id: string;
  orderNumber: string;
  status: string;
  priority: string;
  reportedIssue: string | null;
};
export type RepairDetail = RepairOrder & {
  customerId: string;
  deviceId: string;
  technicianId: string | null;
  trackingToken?: string;
  cliente?: { nombre: string; telefono?: string };
  equipo?: { imei?: string; serial_number?: string };
  diagnosticos?: { id: string; technical_diagnosis?: string }[];
  cotizaciones?: {
    id: string;
    status: string;
    total: string;
    discount?: string;
    tax?: string;
    items?: {
      type?: string;
      description: string;
      quantity: string;
      unit_price: string;
    }[];
  }[];
  partes?: { id: string; status: string; quantity: string }[];
  qa?: { id: string; passed: boolean; notes?: string }[];
  pagos?: { id: string; monto: string; estado: string; fecha_pago: string }[];
  saldo?: { total: number | null; pagado: number; pendiente: number | null };
  garantias?: {
    id: string;
    coverage: string;
    expires_at: string;
    reclamos?: { id: string; status: string; reason: string }[];
  }[];
  fotos?: { id: string; visibility: string }[];
  checklist?: { label: string; result: string; notes?: string }[];
  timeline?: { id: string; title: string; created_at: string }[];
};
export type RepairResources = {
  clientes: { id: string; nombre: string; numero_documento: string }[];
  equipos: {
    id: string;
    customer_id: string;
    imei?: string;
    serial_number?: string;
  }[];
  tipos: { id: string; nombre: string }[];
  tecnicos: { id: string; nombre: string }[];
  productos: { id: string; nombre: string }[];
  almacenes: { id: string; nombre: string }[];
  metodos: { id: string; nombre: string }[];
};
export function fetchRepairs(busqueda = "", pagina = 1, mine = false) {
  const q = new URLSearchParams({
    busqueda,
    pagina: String(pagina),
    limite: "50",
  });
  return apiFetch<{ items: RepairOrder[]; total: number }>(
    `reparaciones${mine ? "/mias" : ""}?${q}`,
  );
}
export function fetchMyRepairs() {
  return fetchRepairs("", 1, true);
}
export function fetchRepairDetail(id: string) {
  return apiFetch<RepairDetail>(`reparaciones/${id}`);
}
export function fetchRepairResources() {
  return apiFetch<RepairResources>("reparaciones/catalogos/operacion");
}
export function changeRepairStatus(id: string, status: string) {
  return apiFetch(`reparaciones/${id}/estado`, {
    method: "PUT",
    body: { status },
  });
}
export function addRepairNote(
  id: string,
  technicalDiagnosis: string,
  publicSummary?: string,
) {
  return apiFetch(`reparaciones/${id}/diagnosticos`, {
    method: "POST",
    body: { technicalDiagnosis, foundIssue: technicalDiagnosis, publicSummary },
  });
}
export function addRepairPhoto(
  id: string,
  base64: string,
  visibility = "INTERNAL",
) {
  return apiFetch(`reparaciones/${id}/fotos`, {
    method: "POST",
    body: { base64, mime: "image/jpeg", visibility },
  });
}
export function repairAction(
  id: string,
  action: string,
  body: unknown = {},
  method = "POST",
) {
  const path = `reparaciones/${id}/${action}`;
  return action === "pagos"
    ? postIdempotent(path, body)
    : apiFetch(path, { method, body });
}
/** Abono idempotente: `intent` se conserva en reintentos y se renueva tras el éxito. */
export function payRepair(
  id: string,
  body: { monto: number; metodoPagoId: string },
  intent: string,
) {
  return postIdempotent(`reparaciones/${id}/pagos`, body, intent);
}
export function estimateAction(id: string, action: string) {
  return apiFetch(`reparaciones/cotizaciones/${id}/${action}`, {
    method: "POST",
    body: {},
  });
}
export function partAction(id: string, action: string) {
  return apiFetch(`reparaciones/repuestos/${id}/${action}`, {
    method: "POST",
    body: {},
  });
}
export function readRepairPhoto(id: string, photo: string) {
  return apiFetch<{ mime: string; base64: string }>(
    `reparaciones/${id}/fotos/${photo}`,
  );
}
