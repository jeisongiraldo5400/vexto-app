import { fetchProductosList, type ProductosListResponse } from '@/admin/products/adapters/products.adapter';
import { useSessionQueryEnabled } from '@/admin/auth/hooks/use-session-query-enabled';
import { useQuery } from '@tanstack/react-query';

import { productsQueryKeys } from './query-keys';

type Options = { minChars?: number };

export type { ProductosListResponse };

export function useProductosQuery(busqueda: string, options?: Options) {
  const minChars = options?.minChars ?? 0;
  const enabledBase = useSessionQueryEnabled();
  const enabled = enabledBase && busqueda.trim().length >= minChars;

  return useQuery({
    queryKey: productsQueryKeys.productos(busqueda),
    queryFn: () => fetchProductosList(busqueda),
    enabled,
  });
}
