import { useSessionQueryEnabled } from '@/admin/auth/hooks/use-session-query-enabled';
import { fetchMetodosPago } from '@/admin/sales/adapters/sales.adapter';
import { useQuery } from '@tanstack/react-query';

import { salesQueryKeys } from './query-keys';

export function useMetodosPagoQuery() {
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: salesQueryKeys.metodosPago,
    queryFn: () => fetchMetodosPago(),
    enabled,
  });
}
