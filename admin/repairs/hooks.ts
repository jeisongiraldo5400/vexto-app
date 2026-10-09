import { useAuthStore } from '@/admin/auth/store/auth-store';
import { useSessionQueryEnabled } from '@/admin/auth/hooks/use-session-query-enabled';
import { fetchMyRepairs, fetchRepairDetail, fetchRepairs } from '@/admin/repairs/adapters';
import { useQuery } from '@tanstack/react-query';

export function useRepairsQuery(mine: boolean) {
  const empresaId = useAuthStore(s => s.empresaId);
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: ['reparaciones', empresaId, mine ? 'mias' : 'all'],
    queryFn: mine ? fetchMyRepairs : () => fetchRepairs(),
    enabled,
  });
}

export function useRepairDetailQuery(id: string) {
  const empresaId = useAuthStore(s => s.empresaId);
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: ['reparaciones', empresaId, id],
    queryFn: () => fetchRepairDetail(id),
    enabled: enabled && !!id,
  });
}
