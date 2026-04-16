import { useAuthStore } from '@/admin/auth/store/auth-store';

export function useSessionQueryEnabled(): boolean {
  return useAuthStore((s) => s.isReady && !!s.user && !s.needsCompanyPick && !!s.empresaId);
}
