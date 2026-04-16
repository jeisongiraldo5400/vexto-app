import * as secureSession from '@/core/session/secure-session';
import type { AuthUser } from '@/core/types';
import { create } from 'zustand';

export type AuthStoreState = {
  isReady: boolean;
  user: AuthUser | null;
  empresaId: string | null;
  needsCompanyPick: boolean;
};

type AuthStoreActions = {
  hydrate: () => Promise<void>;
  syncFromStorage: () => Promise<void>;
  setSession: (patch: { user: AuthUser; empresaId: string; needsCompanyPick: boolean }) => void;
  clearLocal: () => void;
};

export const useAuthStore = create<AuthStoreState & AuthStoreActions>((set) => ({
  isReady: false,
  user: null,
  empresaId: null,
  needsCompanyPick: false,

  hydrate: async () => {
    const s = await secureSession.loadSession();
    if (s) {
      set({
        user: s.user,
        empresaId: s.empresaId,
        needsCompanyPick: s.needsCompanyPick,
      });
    } else {
      set({ user: null, empresaId: null, needsCompanyPick: false });
    }
    set({ isReady: true });
  },

  syncFromStorage: async () => {
    const s = await secureSession.loadSession();
    if (s) {
      set({
        user: s.user,
        empresaId: s.empresaId,
        needsCompanyPick: s.needsCompanyPick,
      });
    } else {
      set({ user: null, empresaId: null, needsCompanyPick: false });
    }
  },

  setSession: (patch) => set(patch),

  clearLocal: () => set({ user: null, empresaId: null, needsCompanyPick: false }),
}));
