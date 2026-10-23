import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/admin/auth/store/auth-store';
import { useChatStore } from '@/admin/chat-sales/store/chat-store';
import { ApiError } from '@/core/http/api-error';
import { loadSession, saveSession } from '@/core/session/secure-session';
import { router } from '@/test-utils/expo-router';
import { createTestQueryClient, withQuery } from '@/test-utils/fixtures';
import { renderHook } from '@/test-utils/renderer';

import { useAuth } from './use-auth';

const api = vi.hoisted(() => ({
  loginRequest: vi.fn(),
  fetchEmpresas: vi.fn(),
  cambiarEmpresaRequest: vi.fn(),
  logoutRequest: vi.fn(),
}));
vi.mock('@/admin/auth/adapters', () => api);
vi.mock('@/core/http/api', () => ({ logoutRequest: api.logoutRequest }));

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;
const user = (empresaId?: string) => ({ id: 'u1', email: 'a@x.co', fullName: 'Ana', roleId: 'r', empresaId });
const empresa = (id: string) => ({ id, nombre: id, nit: null, activo: true, chatVentasHabilitado: false });

function setup() {
  const client = createTestQueryClient();
  const hook = renderHook(() => useAuth(), (children) => withQuery(children, client));
  return { client, ...hook };
}

beforeEach(() => {
  vi.clearAllMocks();
  store.clear();
  useAuthStore.setState({ isReady: true, user: null, empresaId: null, needsCompanyPick: false });
});

describe('useAuth.signIn', () => {
  it('una empresa: guarda tokens en SecureStore y entra a inicio', async () => {
    api.loginRequest.mockResolvedValue({ accessToken: 'a', refreshToken: 'r', user: user() });
    api.fetchEmpresas.mockResolvedValue([empresa('emp-1')]);
    const { result } = setup();
    await result.current.signIn('  ana@x.co ', 'clave');

    expect(api.loginRequest).toHaveBeenCalledWith('ana@x.co', 'clave');
    expect(api.fetchEmpresas).toHaveBeenCalledWith('a');
    await expect(loadSession()).resolves.toMatchObject({
      accessToken: 'a',
      refreshToken: 'r',
      empresaId: 'emp-1',
      needsCompanyPick: false,
    });
    expect(result.current.user?.id).toBe('u1');
    expect(router.replace).toHaveBeenCalledWith('/(app)/(tabs)/inicio');
  });

  it('varias empresas: pide elegir empresa', async () => {
    api.loginRequest.mockResolvedValue({ accessToken: 'a', refreshToken: 'r', user: user('emp-2') });
    api.fetchEmpresas.mockResolvedValue([empresa('emp-1'), empresa('emp-2')]);
    const { result } = setup();
    await result.current.signIn('a@x.co', 'c');
    expect(result.current.needsCompanyPick).toBe(true);
    expect(result.current.empresaId).toBe('emp-2');
    expect(router.replace).toHaveBeenCalledWith('/(auth)/select-empresa');
  });

  it('varias empresas sin predeterminada: entra a elegir empresa (no "sin empresa")', async () => {
    api.loginRequest.mockResolvedValue({ accessToken: 'a', refreshToken: 'r', user: user() });
    api.fetchEmpresas.mockResolvedValue([empresa('emp-1'), empresa('emp-2')]);
    const { result } = setup();
    await result.current.signIn('a@x.co', 'c');
    await expect(loadSession()).resolves.toMatchObject({ needsCompanyPick: true });
    expect(router.replace).toHaveBeenCalledWith('/(auth)/select-empresa');
  });

  it('sin empresa asignada no guarda sesión', async () => {
    api.loginRequest.mockResolvedValue({ accessToken: 'a', refreshToken: 'r', user: user() });
    api.fetchEmpresas.mockResolvedValue([]);
    const { result } = setup();
    await expect(result.current.signIn('a@x.co', 'c')).rejects.toThrow(/no tiene empresa/);
    expect(store.size).toBe(0);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('propaga el error de credenciales sin tocar el almacenamiento', async () => {
    api.loginRequest.mockRejectedValue(new ApiError(401, 'Credenciales inválidas'));
    const { result } = setup();
    await expect(result.current.signIn('a@x.co', 'mal')).rejects.toThrow('Credenciales inválidas');
    expect(store.size).toBe(0);
  });
});

describe('useAuth.completeCompanySelection', () => {
  it('cambia de empresa con el token guardado, limpia caché y chat', async () => {
    await saveSession({ accessToken: 'old', refreshToken: 'r', empresaId: 'emp-1', user: user('emp-1'), needsCompanyPick: true });
    api.cambiarEmpresaRequest.mockResolvedValue({ accessToken: 'new', refreshToken: 'r2', user: user('emp-2') });
    useChatStore.getState().addMessage({ id: 'm', role: 'user', content: 'hola', timestamp: new Date() });
    const { result, client } = setup();
    client.setQueryData(['productos'], [1]);

    await result.current.completeCompanySelection('emp-2');

    expect(api.cambiarEmpresaRequest).toHaveBeenCalledWith('old', 'emp-2');
    await expect(loadSession()).resolves.toMatchObject({ accessToken: 'new', empresaId: 'emp-2', needsCompanyPick: false });
    expect(client.getQueryData(['productos'])).toBeUndefined();
    expect(useChatStore.getState().messages).toEqual([]);
    expect(result.current.needsCompanyPick).toBe(false);
    expect(router.replace).toHaveBeenCalledWith('/(app)/(tabs)/inicio');
  });

  it('sin sesión guardada falla', async () => {
    const { result } = setup();
    await expect(result.current.completeCompanySelection('emp-2')).rejects.toThrow('No hay sesión');
  });
});

describe('useAuth.signOut', () => {
  beforeEach(async () => {
    await saveSession({ accessToken: 'tok', refreshToken: 'r', empresaId: 'e', user: user('e'), needsCompanyPick: false });
    useAuthStore.setState({ user: user('e'), empresaId: 'e' });
  });

  it('revoca en servidor, borra tokens y vuelve al login', async () => {
    api.logoutRequest.mockResolvedValue(undefined);
    const { result } = setup();
    await result.current.signOut();
    expect(api.logoutRequest).toHaveBeenCalledWith('tok');
    expect(store.size).toBe(0);
    expect(result.current.user).toBeNull();
    expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('si el servidor no responde cierra igual localmente y avisa', async () => {
    api.logoutRequest.mockRejectedValue(new Error('offline'));
    const { result } = setup();
    await result.current.signOut();
    expect(store.size).toBe(0);
    expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
    expect(Alert.alert).toHaveBeenCalledWith('Sesión cerrada en este dispositivo', expect.any(String));
  });
});

describe('auth-store', () => {
  it('hydrate refleja SecureStore y marca listo', async () => {
    useAuthStore.setState({ isReady: false });
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState()).toMatchObject({ isReady: true, user: null });
    await saveSession({ accessToken: 't', refreshToken: 'r', empresaId: 'e', user: user('e'), needsCompanyPick: true });
    await useAuthStore.getState().syncFromStorage();
    expect(useAuthStore.getState()).toMatchObject({ empresaId: 'e', needsCompanyPick: true });
    useAuthStore.getState().clearLocal();
    expect(useAuthStore.getState()).toMatchObject({ user: null, empresaId: null, needsCompanyPick: false });
  });
});
