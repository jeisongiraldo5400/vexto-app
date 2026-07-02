import { fetchStockAlmacenAll } from '@/admin/sales/adapters/sales.adapter';
import { useSessionQueryEnabled } from '@/admin/auth/hooks/use-session-query-enabled';
import { useQuery } from '@tanstack/react-query';

export function useStockAlmacenQuery(almacenId: string | null, busqueda: string) {
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: ['stock', 'almacen', almacenId, busqueda],
    queryFn: async () => {
      const stocks = await fetchStockAlmacenAll(almacenId!, busqueda);
      return { stocks, total: stocks.length };
    },
    enabled: enabled && !!almacenId,
    staleTime: 30_000,
    retry: false,
  });
}
