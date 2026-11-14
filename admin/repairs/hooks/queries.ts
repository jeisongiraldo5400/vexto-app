import { useAuthStore } from "@/admin/auth/store/auth-store";
import { useSessionQueryEnabled } from "@/admin/auth/hooks/use-session-query-enabled";
import {
  fetchRepairDetail,
  fetchRepairResources,
  fetchRepairs,
} from "@/admin/repairs/adapters";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

export function useRepairsQuery(mine: boolean, page = 1, search = "") {
  const empresaId = useAuthStore((s) => s.empresaId);
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: ["reparaciones", empresaId, mine ? "mias" : "all", page, search],
    queryFn: () => fetchRepairs(search, page, mine),
    enabled,
    // Mantiene la lista anterior mientras llega la nueva búsqueda/página.
    placeholderData: keepPreviousData,
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

/** Catálogos de operación (clientes, técnicos, productos, almacenes, métodos). */
export function useRepairResourcesQuery(allowed: boolean) {
  const empresaId = useAuthStore((s) => s.empresaId);
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: ["repair-resources", empresaId],
    queryFn: fetchRepairResources,
    enabled: enabled && allowed,
  });
}
