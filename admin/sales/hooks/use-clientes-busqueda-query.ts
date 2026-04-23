import { fetchClientesBusqueda } from '@/admin/sales/adapters/clientes.adapter';
import { useSessionQueryEnabled } from '@/admin/auth/hooks/use-session-query-enabled';
import { useQuery } from '@tanstack/react-query';

import { salesQueryKeys } from './query-keys';

type Options = { minChars?: number };

export function useClientesBusquedaQuery(busqueda: string, options?: Options) {
  const minChars = options?.minChars ?? 2;
  const enabledBase = useSessionQueryEnabled();
  const q = busqueda.trim();
  const enabled = enabledBase && q.length >= minChars;

  return useQuery({
    queryKey: salesQueryKeys.clientesBusqueda(q),
    queryFn: () => fetchClientesBusqueda(q),
    enabled,
    staleTime: 30 * 1000,
  });
}
