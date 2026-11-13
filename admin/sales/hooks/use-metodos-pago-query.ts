import { useSessionQueryEnabled } from '@/admin/auth/hooks/use-session-query-enabled';
import { fetchMetodosPago } from '@/admin/sales/adapters/sales.adapter';
import { useQuery } from '@tanstack/react-query';

import { salesQueryKeys } from './query-keys';

/** `active: false` pospone la consulta (pantallas que solo la usan con el módulo caja). */
export function useMetodosPagoQuery(active = true) {
  const enabled = useSessionQueryEnabled() && active;
  return useQuery({
    queryKey: salesQueryKeys.metodosPago,
    queryFn: () => fetchMetodosPago(),
    enabled,
  });
}
