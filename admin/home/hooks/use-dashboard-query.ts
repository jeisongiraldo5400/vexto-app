import { useSessionQueryEnabled } from '@/admin/auth/hooks/use-session-query-enabled';
import { fetchDashboard } from '@/admin/home/adapters/home.adapter';
import { useQuery } from '@tanstack/react-query';

import { homeQueryKeys } from './query-keys';

export function useDashboardQuery() {
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: homeQueryKeys.dashboard,
    queryFn: fetchDashboard,
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
}
