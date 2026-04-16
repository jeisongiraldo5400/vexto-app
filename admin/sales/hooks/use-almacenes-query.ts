import { useSessionQueryEnabled } from '@/admin/auth/hooks/use-session-query-enabled';
import { fetchAlmacenes } from '@/admin/sales/adapters/sales.adapter';
import { useQuery } from '@tanstack/react-query';

import { salesQueryKeys } from './query-keys';

export function useAlmacenesQuery() {
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: salesQueryKeys.almacenes,
    queryFn: () => fetchAlmacenes(),
    enabled,
  });
}
