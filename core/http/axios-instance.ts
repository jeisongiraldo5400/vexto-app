import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';

import { getApiBaseUrl } from '@/core/config';
import * as secureSession from '@/core/session/secure-session';
import type { AuthResponse, AuthUser } from '@/core/types';

import { authHttpBridge } from './auth-bridge';
import { ApiError } from './api-error';
import { toApiError } from './parse-error';

export function normalizeApiPath(path: string): string {
  return path.startsWith('/') ? path.slice(1) : path;
}

export const publicAxios = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export const authedAxios = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

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
      await secureSession.clearSession();
      authHttpBridge.clearLocal();
      return Promise.reject(new ApiError(401, 'Sesión expirada'));
    }

    try {
      const { data: refreshed } = await publicAxios.post<AuthResponse>('auth/refresh', {
        refreshToken: session.refreshToken,
      });
      const empresaId = refreshed.user.empresaId ?? session.empresaId;
      await secureSession.saveSession({
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        empresaId,
        user: refreshed.user as AuthUser,
        needsCompanyPick: false,
      });
      await authHttpBridge.syncFromStorage();
      return authedAxios.request(original);
    } catch {
      await secureSession.clearSession();
      authHttpBridge.clearLocal();
      return Promise.reject(new ApiError(401, 'Sesión expirada'));
    }
  },
);
