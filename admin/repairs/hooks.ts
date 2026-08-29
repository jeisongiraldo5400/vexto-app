import { useSessionQueryEnabled } from '@/admin/auth/hooks/use-session-query-enabled';
import { fetchMyRepairs, fetchRepairDetail, fetchRepairs } from '@/admin/repairs/adapters';
import { useQuery } from '@tanstack/react-query';

export function useRepairsQuery(mine: boolean) {
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: ['reparaciones', mine ? 'mias' : 'all'],
    queryFn: mine ? fetchMyRepairs : () => fetchRepairs(),
    enabled,
  });
}

export function useRepairDetailQuery(id: string) {
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: ['reparaciones', id],
    queryFn: () => fetchRepairDetail(id),
    enabled: enabled && !!id,
  });
}
