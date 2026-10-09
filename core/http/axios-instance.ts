import {
  create as createAxios,
  isAxiosError,
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

import { getApiBaseUrl } from '@/core/config';
import * as secureSession from '@/core/session/secure-session';
import type { AuthResponse, AuthUser } from '@/core/types';

import { authHttpBridge } from './auth-bridge';
import { ApiError } from './api-error';
import { toApiError } from './parse-error';

export function normalizeApiPath(path: string): string {
  return path.startsWith('/') ? path.slice(1) : path;
}

function attachResolvedApiBaseURL(client: AxiosInstance) {
  client.interceptors.request.use((config) => {
    config.baseURL = getApiBaseUrl();
    return config;
  });
}

export const publicAxios = createAxios({
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export const authedAxios = createAxios({
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

attachResolvedApiBaseURL(publicAxios);
attachResolvedApiBaseURL(authedAxios);

authedAxios.interceptors.request.use(async (config) => {
  const session = await secureSession.loadSession();
  if (!session) {
    return Promise.reject(new ApiError(401, 'No hay sesión'));
  }
  const headers = AxiosHeaders.from(config.headers ?? {});
  headers.set('Authorization', `Bearer ${session.accessToken}`);
  if (!config.skipCompanyHeader) {
    headers.set('X-Company-Id', session.empresaId);
  }
  config.headers = headers;
  return config;
});

// Todas las respuestas 401 comparten una única rotación del refresh token.
let refreshInFlight: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
  const session = await secureSession.loadSession();
  if (!session) throw new ApiError(401, 'Sesión expirada');

  try {
    const { data: refreshed } = await publicAxios.post<AuthResponse>('auth/refresh', {
      refreshToken: session.refreshToken,
    });
    const current = await secureSession.loadSession();
    // Un logout, login o cambio de empresa puede ocurrir mientras llega la respuesta.
    if (current?.refreshToken !== session.refreshToken) return;
    await secureSession.saveSession({
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      empresaId: refreshed.user.empresaId ?? session.empresaId,
      user: refreshed.user as AuthUser,
      needsCompanyPick: session.needsCompanyPick,
    });
    await authHttpBridge.syncFromStorage();
  } catch (error) {
    const current = await secureSession.loadSession();
    if (current?.refreshToken !== session.refreshToken) return;
    // Un fallo de red o del servidor permite reintentar sin borrar la sesión.
    if (isAxiosError(error) && [400, 401, 403].includes(error.response?.status ?? 0)) {
      await secureSession.clearSession();
      authHttpBridge.clearLocal();
      throw new ApiError(401, 'Sesión expirada');
    }
    throw toApiError(error);
  }
}

authedAxios.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig | undefined;
    if (!original || error.response?.status !== 401 || original._retry401) {
      return Promise.reject(toApiError(error));
    }

    original._retry401 = true;
    const session = await secureSession.loadSession();
    if (!session) {
      authHttpBridge.clearLocal();
      throw new ApiError(401, 'Sesión expirada');
    }
    const sentToken = AxiosHeaders.from(original.headers).get('Authorization');
    // Un 401 tardío puede pertenecer al token anterior a una renovación completada.
    if (sentToken === `Bearer ${session.accessToken}`) {
      if (!refreshInFlight) {
        refreshInFlight = refreshSession().finally(() => { refreshInFlight = null; });
      }
      await refreshInFlight;
    }
    return authedAxios.request(original);
  },
);
