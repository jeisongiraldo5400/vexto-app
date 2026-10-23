import { useSessionQueryEnabled } from "@/admin/auth/hooks/use-session-query-enabled";
import { useAuthStore } from "@/admin/auth/store/auth-store";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchCliente, fetchClientes } from "./adapters";

export function useClientesQuery(busqueda: string, page: number) {
  const empresaId = useAuthStore((s) => s.empresaId);
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: ["clientes", empresaId, "lista", busqueda.trim(), page],
    queryFn: () => fetchClientes(busqueda, page),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useClienteQuery(id: string | undefined) {
  const empresaId = useAuthStore((s) => s.empresaId);
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: ["clientes", empresaId, "detalle", id],
    queryFn: () => fetchCliente(id!),
    enabled: enabled && !!id,
  });
}
