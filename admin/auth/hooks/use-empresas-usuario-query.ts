import { fetchEmpresas } from '@/admin/auth/adapters';
import { useAuthStore } from '@/admin/auth/store/auth-store';
import * as secureSession from '@/core/session/secure-session';
import type { EmpresaDelUsuario } from '@/core/types';
import { useQuery } from '@tanstack/react-query';

import { authQueryKeys } from './query-keys';

export function useEmpresasUsuarioQuery() {
  const needsPick = useAuthStore((s) => s.needsCompanyPick);
  const isReady = useAuthStore((s) => s.isReady);
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: authQueryKeys.empresasUsuario,
    enabled: isReady && !!user && needsPick,
    queryFn: async (): Promise<EmpresaDelUsuario[]> => {
      const s = await secureSession.loadSession();
      if (!s?.accessToken) throw new Error('No hay sesión');
      return fetchEmpresas(s.accessToken);
    },
  });
}
