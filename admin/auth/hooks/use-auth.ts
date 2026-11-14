import { logoutRequest } from '@/core/http/api';
import { useChatStore } from '@/admin/chat-sales/store/chat-store';
import { Alert } from 'react-native';
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
      // Con varias empresas la primera es provisional: el usuario elige en select-empresa.
      if (!resolvedEmpresaId && empresas.length >= 1) {
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
        router.replace('/(app)/(tabs)/inicio');
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
      await queryClient.cancelQueries();
      queryClient.removeQueries();
      useChatStore.getState().clearChat();
      await secureSession.saveSession({
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        empresaId: eid,
        user: nextUser,
        needsCompanyPick: false,
      });
      setSession({ user: nextUser, empresaId: eid, needsCompanyPick: false });
      router.replace('/(app)/(tabs)/inicio');
    },
    [router, setSession, queryClient],
  );

  /** `revoke: false` omite el logout del servidor (p. ej. si ya revocó las sesiones). */
  const signOut = useCallback(async (options?: { revoke?: boolean }) => {
    const session = await secureSession.loadSession();
    let failed = false;
    try {
      if (session && options?.revoke !== false) await logoutRequest(session.accessToken);
    } catch { failed = true; }
    await queryClient.cancelQueries();
    await secureSession.clearSession();
    useChatStore.getState().clearChat();
    clearLocal();
    queryClient.removeQueries();
    router.replace('/(auth)/login');
    if (failed) Alert.alert('Sesión cerrada en este dispositivo', 'No se pudo revocar la sesión en el servidor. Revisa la conexión.');
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
