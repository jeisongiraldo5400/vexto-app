import { useAuthStore } from "@/admin/auth/store/auth-store";
import { useSessionQueryEnabled } from "@/admin/auth/hooks/use-session-query-enabled";
import { fetchRepairDetail, fetchRepairs } from "@/admin/repairs/adapters";
import { useQuery } from "@tanstack/react-query";

export function useRepairsQuery(mine: boolean, page = 1, search = "") {
  const empresaId = useAuthStore((s) => s.empresaId);
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: ["reparaciones", empresaId, mine ? "mias" : "all", page, search],
    queryFn: () => fetchRepairs(search, page, mine),
    enabled,
  });
}

export function useRepairDetailQuery(id: string) {
  const empresaId = useAuthStore((s) => s.empresaId);
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: ["reparaciones", empresaId, id],
    queryFn: () => fetchRepairDetail(id),
    enabled: enabled && !!id,
  });
}
