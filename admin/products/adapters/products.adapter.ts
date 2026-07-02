import { apiFetch } from '@/core/http/api';
import type { Producto } from '@/core/types';

export type ProductosListResponse = { productos: Producto[]; total: number };

const PRODUCTOS_PAGE_SIZE = 100;

export async function fetchProductosList(busqueda: string): Promise<ProductosListResponse> {
  const all: Producto[] = [];
  let pagina = 1;
  let total = Infinity;

  while (all.length < total) {
    const params = new URLSearchParams({
      busqueda: busqueda.trim(),
      limite: String(PRODUCTOS_PAGE_SIZE),
      pagina: String(pagina),
      estado: 'activo',
    });

    const page = await apiFetch<ProductosListResponse>(`/productos?${params.toString()}`);
    total = page.total;
    all.push(...page.productos);

    if (page.productos.length === 0) break;
    pagina += 1;
  }

  return { productos: all, total: all.length };
}

export function fetchProductoByCodigoBarras(codigo: string) {
  return apiFetch<Producto>(`/productos/codigo-barras/${encodeURIComponent(codigo)}`);
}
