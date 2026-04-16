import {
  cambiarEmpresaRequest,
  fetchEmpresas,
  loginRequest,
} from '@/admin/auth/adapters';
import * as secureSession from '@/core/session/secure-session';
import type { AuthUser } from '@/core/types';
import { useAuthStore } from '@/admin/auth/store/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isReady = useAuthStore((s) => s.isReady);
  const user = useAuthStore((s) => s.user);
  const empresaId = useAuthStore((s) => s.empresaId);
  const needsCompanyPick = useAuthStore((s) => s.needsCompanyPick);
  const setSession = useAuthStore((s) => s.setSession);
  const clearLocal = useAuthStore((s) => s.clearLocal);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const auth = await loginRequest(email.trim(), password);
      const empresas = await fetchEmpresas(auth.accessToken);
      let resolvedEmpresaId = auth.user.empresaId ?? '';
      if (!resolvedEmpresaId && empresas.length === 1) {
        resolvedEmpresaId = empresas[0].id;
      }
      if (!resolvedEmpresaId) {
        throw new Error('Tu usuario no tiene empresa asignada. Contacta al administrador.');
      }
      const multi = empresas.length > 1;
      const session = {
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        empresaId: resolvedEmpresaId,
        user: auth.user as AuthUser,
        needsCompanyPick: multi,
      };
      await secureSession.saveSession(session);
      setSession({
        user: auth.user as AuthUser,
        empresaId: resolvedEmpresaId,
        needsCompanyPick: multi,
      });
      if (multi) {
        router.replace('/(auth)/select-empresa');
      } else {
        router.replace('/(app)/(tabs)/venta');
      }
    },
    [router, setSession],
  );

  const completeCompanySelection = useCallback(
    async (nextEmpresaId: string) => {
      const s = await secureSession.loadSession();
      if (!s) throw new Error('No hay sesión');
      const auth = await cambiarEmpresaRequest(s.accessToken, nextEmpresaId);
      const nextUser = auth.user as AuthUser;
      const eid = nextUser.empresaId ?? nextEmpresaId;
      await secureSession.saveSession({
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        empresaId: eid,
        user: nextUser,
        needsCompanyPick: false,
      });
      setSession({ user: nextUser, empresaId: eid, needsCompanyPick: false });
      queryClient.invalidateQueries();
      router.replace('/(app)/(tabs)/venta');
    },
    [router, setSession, queryClient],
  );

  const signOut = useCallback(async () => {
    await secureSession.clearSession();
    clearLocal();
    queryClient.removeQueries();
    router.replace('/(auth)/login');
  }, [router, clearLocal, queryClient]);

  return useMemo(
    () => ({
      isReady,
      user,
      empresaId,
      needsCompanyPick,
      signIn,
      signOut,
      completeCompanySelection,
    }),
    [isReady, user, empresaId, needsCompanyPick, signIn, signOut, completeCompanySelection],
  );
}
