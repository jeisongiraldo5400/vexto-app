import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { AppState } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/admin/auth/store/auth-store';
import { authHttpBridge } from '@/core/http/auth-bridge';
import { AppProviders } from '@/providers/app-providers';
import { createTestQueryClient, makeUser, withQuery } from '@/test-utils/fixtures';
import { render, renderHook, waitFor } from '@/test-utils/renderer';

import { loadSession, saveSession } from './secure-session';
import { useCapabilitiesSync } from './use-capabilities-sync';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('@/core/http/api', () => ({ apiFetch }));

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;
const base = makeUser(['pos:crear'], ['pos']);

beforeEach(async () => {
  vi.clearAllMocks();
  store.clear();
  await saveSession({ accessToken: 't', refreshToken: 'r', empresaId: 'e1', user: base, needsCompanyPick: false });
  useAuthStore.setState({ isReady: true, user: base, empresaId: 'e1', needsCompanyPick: false });
});

describe('useCapabilitiesSync', () => {
  it('aplica permisos nuevos del perfil y limpia la caché', async () => {
    const updated = { ...base, permisos: ['pos:crear', 'gastos:ver'], modulosHabilitados: ['pos', 'finanzas'] };
    apiFetch.mockResolvedValue(updated);
    const client = createTestQueryClient();
    client.setQueryData(['productos'], [1]);
    renderHook(() => useCapabilitiesSync(), (c) => withQuery(c, client));

    await waitFor(() => expect(useAuthStore.getState().user?.permisos).toContain('gastos:ver'));
    expect(apiFetch).toHaveBeenCalledWith('auth/profile');
    expect((await loadSession())?.user.modulosHabilitados).toEqual(['pos', 'finanzas']);
    expect(client.getQueryData(['productos'])).toBeUndefined();
  });

  it('no toca nada si los permisos no cambiaron o el perfil es de otra empresa', async () => {
    apiFetch.mockResolvedValue({ ...base });
    const client = createTestQueryClient();
    client.setQueryData(['productos'], [1]);
    renderHook(() => useCapabilitiesSync(), (c) => withQuery(c, client));
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 10));
    expect(client.getQueryData(['productos'])).toEqual([1]);

    apiFetch.mockResolvedValue({ ...base, empresaId: 'otra', permisos: [] });
    const listener = vi.mocked(AppState.addEventListener).mock.calls[0][1] as (s: string) => void;
    listener('active');
    await new Promise((r) => setTimeout(r, 10));
    expect(useAuthStore.getState().user?.permisos).toEqual(['pos:crear']);
  });

  it('un fallo de red no cierra la sesión', async () => {
    apiFetch.mockRejectedValue(new Error('offline'));
    renderHook(() => useCapabilitiesSync(), (c) => withQuery(c));
    await waitFor(() => expect(apiFetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 10));
    expect(useAuthStore.getState().user).not.toBeNull();
    expect(await loadSession()).not.toBeNull();
  });

  it('sin usuario no consulta el perfil', () => {
    useAuthStore.setState({ user: null, empresaId: null });
    renderHook(() => useCapabilitiesSync(), (c) => withQuery(c));
    expect(apiFetch).not.toHaveBeenCalled();
  });
});

describe('AppProviders', () => {
  it('hidrata la sesión, oculta el splash y conecta el puente HTTP con el store', async () => {
    useAuthStore.setState({ isReady: false, user: null, empresaId: null });
    const view = render(<AppProviders>{'contenido'}</AppProviders>);
    expect(view.text()).toBe('contenido');
    await waitFor(() => expect(useAuthStore.getState().isReady).toBe(true));
    expect(useAuthStore.getState().empresaId).toBe('e1');
    await waitFor(() => expect(SplashScreen.hideAsync).toHaveBeenCalled());

    authHttpBridge.clearLocal();
    expect(useAuthStore.getState().user).toBeNull();
    await authHttpBridge.syncFromStorage();
    expect(useAuthStore.getState().user?.id).toBe('u1');
  });
});
