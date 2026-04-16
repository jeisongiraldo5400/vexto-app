import { apiFetch } from '@/core/http/api';
import type { Almacen, MetodoPago, StockInfo, VentaResponse } from '@/core/types';

export type CrearVentaPayload = {
  almacenId: string;
  metodoPagoId: string;
  items: { productoId: string; cantidad: number }[];
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

export function crearVenta(body: CrearVentaPayload) {
  return apiFetch<VentaResponse>('/ventas', { method: 'POST', body });
}
