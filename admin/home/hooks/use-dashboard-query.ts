import { useSessionQueryEnabled } from '@/admin/auth/hooks/use-session-query-enabled';
import { useAuthStore } from '@/admin/auth/store/auth-store';
import { fetchDashboard } from '@/admin/home/adapters/home.adapter';
import { useQuery } from '@tanstack/react-query';

import { homeQueryKeys } from './query-keys';

export function useDashboardQuery(moduleEnabled = true) {
  const enabled = useSessionQueryEnabled();
  const empresaId = useAuthStore((s) => s.empresaId);
  return useQuery({
    queryKey: homeQueryKeys.dashboard(empresaId),
    queryFn: fetchDashboard,
    enabled: enabled && moduleEnabled,
    staleTime: 60_000,
    retry: 1,
  });
}
