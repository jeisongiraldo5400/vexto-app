import { postIdempotent } from "@/core/http/idempotent";
import { apiFetch } from "@/core/http/api";
import { toLocalYmd } from "@/core/utils/date";

export type CrearVentaCreditoPagoLinea = {
  metodoPagoId: string;
  monto: number;
  montoRecibido?: number;
};

export type CrearVentaCreditoPayload = {
  almacenId: string;
  clienteId: string;
  items: { productoId: string; cantidad: number }[];
  cuotaInicial: number;
  /** @deprecated usar pagosCuotaInicial */
  cuotaInicialMetodoPagoId?: string;
  pagosCuotaInicial?: CrearVentaCreditoPagoLinea[];
  numeroCuotas: number;
  frecuenciaDias: number;
  observaciones?: string;
};

export type CrearVentaCreditoResponse = {
  ventaId: string;
  numeroFactura: string;
  total: number;
  credito: { id: string; saldoPendiente: number };
};

export function crearVentaCredito(
  body: CrearVentaCreditoPayload,
  intent?: string,
) {
  return postIdempotent<CrearVentaCreditoResponse>(
    "/creditos/ventas",
    body,
    intent,
  );
}

export function fetchDeudaCliente(clienteId: string) {
  return apiFetch<{ clienteId: string; deuda: number }>(
    `/creditos/cliente/${clienteId}/deuda`,
  );
}

export function previewCuotas(
  montoTotal: number,
  cuotaInicial: number,
  numeroCuotas: number,
  frecuenciaDias: number,
): { numero: number; monto: number; fecha: string }[] {
  const saldo = Math.round((montoTotal - cuotaInicial) * 100) / 100;
  const out: { numero: number; monto: number; fecha: string }[] = [];
  const hoy = new Date();

  if (cuotaInicial > 0) {
    out.push({
      numero: 0,
      monto: cuotaInicial,
      fecha: toLocalYmd(hoy),
    });
  }

  if (saldo > 0 && numeroCuotas > 0) {
    const base = Math.floor((saldo / numeroCuotas) * 100) / 100;
    let acc = 0;
    for (let i = 1; i <= numeroCuotas; i++) {
      const d = new Date(hoy);
      d.setDate(d.getDate() + frecuenciaDias * i);
      const monto =
        i === numeroCuotas ? Math.round((saldo - acc) * 100) / 100 : base;
      acc += monto;
      out.push({ numero: i, monto, fecha: toLocalYmd(d) });
    }
  }

  return out;
}
