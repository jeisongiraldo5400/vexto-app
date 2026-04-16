import { apiFetch } from '@/core/http/api';
import type { Producto } from '@/core/types';

export type ProductosListResponse = { productos: Producto[]; total: number };

export function fetchProductosList(busqueda: string) {
  return apiFetch<ProductosListResponse>(
    `/productos?busqueda=${encodeURIComponent(busqueda.trim())}&limite=50&pagina=1`,
  );
}

export function fetchProductoByCodigoBarras(codigo: string) {
  return apiFetch<Producto>(`/productos/codigo-barras/${encodeURIComponent(codigo)}`);
}
