import type { QueryClient } from '@tanstack/react-query';

import { homeQueryKeys } from '@/admin/home/hooks/query-keys';

export function invalidateAfterVenta(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: homeQueryKeys.dashboard });
  void queryClient.invalidateQueries({ queryKey: ['stock'] });
  void queryClient.invalidateQueries({ queryKey: ['productos'] });
}
