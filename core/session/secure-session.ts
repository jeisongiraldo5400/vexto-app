import * as SecureStore from 'expo-secure-store';

import type { AuthUser } from '@/core/types';

const K_ACCESS = 'vexto_access_token';
const K_REFRESH = 'vexto_refresh_token';
const K_EMPRESA = 'vexto_empresa_id';
const K_USER = 'vexto_user_json';
const K_NEEDS_COMPANY = 'vexto_needs_company_pick';

export type StoredSession = {
  accessToken: string;
  refreshToken: string;
  empresaId: string;
  user: AuthUser;
  needsCompanyPick: boolean;
};

export async function loadSession(): Promise<StoredSession | null> {
  const accessToken = await SecureStore.getItemAsync(K_ACCESS);
  const refreshToken = await SecureStore.getItemAsync(K_REFRESH);
  const empresaId = await SecureStore.getItemAsync(K_EMPRESA);
  const userJson = await SecureStore.getItemAsync(K_USER);
  const needsRaw = await SecureStore.getItemAsync(K_NEEDS_COMPANY);

  if (!accessToken || !refreshToken || !empresaId || !userJson) {
    return null;
  }

  let user: AuthUser;
  try {
    user = JSON.parse(userJson) as AuthUser;
  } catch {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    empresaId,
    user,
    needsCompanyPick: needsRaw === '1',
  };
}

export async function saveSession(data: StoredSession): Promise<void> {
  await SecureStore.setItemAsync(K_ACCESS, data.accessToken);
  await SecureStore.setItemAsync(K_REFRESH, data.refreshToken);
  await SecureStore.setItemAsync(K_EMPRESA, data.empresaId);
  await SecureStore.setItemAsync(K_USER, JSON.stringify(data.user));
  await SecureStore.setItemAsync(K_NEEDS_COMPANY, data.needsCompanyPick ? '1' : '0');
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(K_ACCESS);
  await SecureStore.deleteItemAsync(K_REFRESH);
  await SecureStore.deleteItemAsync(K_EMPRESA);
  await SecureStore.deleteItemAsync(K_USER);
  await SecureStore.deleteItemAsync(K_NEEDS_COMPANY);
}
