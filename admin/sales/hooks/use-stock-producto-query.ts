import { fetchStockProductoAlmacen } from '@/admin/sales/adapters/sales.adapter';
import { useQuery } from '@tanstack/react-query';

import { salesQueryKeys } from './query-keys';

export function useStockProductoQuery(productoId: string | null, almacenId: string | null) {
  return useQuery({
    queryKey: salesQueryKeys.stockProductoAlmacen(productoId ?? '', almacenId ?? ''),
    queryFn: () => fetchStockProductoAlmacen(productoId!, almacenId!),
    enabled: !!productoId && !!almacenId,
    retry: false,
    staleTime: 30_000,
  });
}
