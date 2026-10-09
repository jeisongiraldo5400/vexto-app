import * as secureSession from '@/core/session/secure-session';
import { apiFetch } from '@/core/http/api';
import type { Almacen, MetodoPago, StockInfo, VentaResponse } from '@/core/types';

export type PagoLineaPayload = {
  metodoPagoId: string;
  monto: number;
  montoRecibido?: number;
  referencia?: string;
};

export type CrearVentaPayload = {
  almacenId: string;
  metodoPagoId?: string;
  pagos?: PagoLineaPayload[];
  items: { productoId: string; cantidad: number }[];
  clienteId?: string;
  plazoDias?: number;
};

export function fetchAlmacenes() {
  return apiFetch<Almacen[]>('/almacenes');
}

export function fetchMetodosPago() {
  return apiFetch<MetodoPago[]>('/metodos-pago');
}

export function fetchStockProductoAlmacen(productoId: string, almacenId: string) {
  return apiFetch<StockInfo>(`/stock/producto/${productoId}/almacen/${almacenId}`);
}

const STOCK_PAGE_SIZE = 100;

export type StockAlmacenResponse = { stocks: StockInfo[]; total: number };

export function fetchStockAlmacen(almacenId: string, busqueda = '', pagina = 1, limite = 200) {
  const q = new URLSearchParams({
    pagina: String(pagina),
    limite: String(limite),
    ...(busqueda.trim() ? { busqueda: busqueda.trim() } : {}),
  });
  return apiFetch<StockAlmacenResponse>(`/stock/almacen/${almacenId}?${q.toString()}`);
}

export async function fetchStockAlmacenAll(almacenId: string, busqueda = '') {
  const all: StockInfo[] = [];
  let pagina = 1;
  let total = Infinity;

  while (all.length < total) {
    const result = await fetchStockAlmacen(almacenId, busqueda, pagina, STOCK_PAGE_SIZE);
    total = result.total;
    all.push(...result.stocks);

    if (result.stocks.length === 0) break;
    pagina += 1;
  }

  return all;
}

const pendingSales = new Map<string, string>();
export async function crearVenta(body: CrearVentaPayload) {
  const session = await secureSession.loadSession();
  const fingerprint = JSON.stringify([session?.user.id, session?.empresaId, body]);
  let key = pendingSales.get(fingerprint);
  if (!key) {
    key = `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    pendingSales.set(fingerprint, key);
  }
  const result = await apiFetch<VentaResponse>('/ventas', { method: 'POST', body, headers: { 'Idempotency-Key': key } });
  pendingSales.delete(fingerprint);
  return result;
}
