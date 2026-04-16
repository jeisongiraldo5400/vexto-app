import { useSessionQueryEnabled } from '@/admin/auth/hooks/use-session-query-enabled';
import { fetchUnidadesMedida } from '@/admin/units/adapters/units.adapter';
import { useQuery } from '@tanstack/react-query';

import { unitsQueryKeys } from './query-keys';

export function useUnidadesMedidaQuery() {
  const enabled = useSessionQueryEnabled();
  return useQuery({
    queryKey: unitsQueryKeys.unidadesMedida,
    queryFn: () => fetchUnidadesMedida(),
    enabled,
  });
}
