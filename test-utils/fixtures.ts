import { useAuthStore } from '@/admin/auth/store/auth-store';
import type { AuthUser } from '@/core/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';

export function makeUser(permisos: string[], modulosHabilitados: string[], extra: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'u1',
    email: 'ana@vexto.co',
    fullName: 'Ana Pérez',
    roleId: 'r1',
    empresaId: 'e1',
    permisos,
    modulosHabilitados,
    ...extra,
  };
}

/** Sesión lista en el store (sin tocar SecureStore). */
export function signInAs(user: AuthUser | null, patch: { needsCompanyPick?: boolean; isReady?: boolean } = {}) {
  useAuthStore.setState({
    isReady: patch.isReady ?? true,
    user,
    empresaId: user ? 'e1' : null,
    needsCompanyPick: patch.needsCompanyPick ?? false,
  });
}

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
}

export function withQuery(node: ReactNode, client = createTestQueryClient()) {
  return createElement(QueryClientProvider, { client }, node);
}
