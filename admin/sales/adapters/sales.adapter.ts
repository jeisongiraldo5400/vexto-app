import { apiFetch } from '@/core/http/api';
import type { Almacen, MetodoPago, StockInfo, VentaResponse } from '@/core/types';

export type CrearVentaPayload = {
  almacenId: string;
  metodoPagoId: string;
  items: { productoId: string; cantidad: number }[];
  clienteId?: string;
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

export type StockAlmacenResponse = { stocks: StockInfo[]; total: number };

export function fetchStockAlmacen(almacenId: string, busqueda = '', pagina = 1, limite = 200) {
  const q = new URLSearchParams({
    pagina: String(pagina),
    limite: String(limite),
    ...(busqueda.trim() ? { busqueda: busqueda.trim() } : {}),
  });
  return apiFetch<StockAlmacenResponse>(`/stock/almacen/${almacenId}?${q.toString()}`);
}

export function crearVenta(body: CrearVentaPayload) {
  return apiFetch<VentaResponse>('/ventas', { method: 'POST', body });
}
