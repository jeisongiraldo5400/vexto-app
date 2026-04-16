import * as secureSession from '@/core/session/secure-session';
import type { AuthResponse, AuthUser, EmpresaDelUsuario } from '@/core/types';

import { ApiError } from './api-error';
import { authedAxios, normalizeApiPath, publicAxios } from './axios-instance';
import { toApiError } from './parse-error';

export { ApiError } from './api-error';

export async function loginRequest(email: string, password: string): Promise<AuthResponse> {
  try {
    const { data } = await publicAxios.post<AuthResponse>('auth/login', { email, password });
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function refreshTokens(refreshToken: string): Promise<AuthResponse> {
  try {
    const { data } = await publicAxios.post<AuthResponse>('auth/refresh', { refreshToken });
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function fetchEmpresas(accessToken: string): Promise<EmpresaDelUsuario[]> {
  try {
    const { data } = await publicAxios.get<EmpresaDelUsuario[]>('auth/empresas', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

export async function cambiarEmpresaRequest(accessToken: string, empresaId: string): Promise<AuthResponse> {
  try {
    const { data } = await publicAxios.post<AuthResponse>(
      'auth/cambiar-empresa',
      { empresaId },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return data;
  } catch (e) {
    throw toApiError(e);
  }
}

type ApiFetchInit = {
  method?: string;
  body?: unknown;
  /** No enviar X-Company-Id (rutas /auth que solo usan JWT). */
  skipCompanyHeader?: boolean;
};

function parseBody(body: unknown): unknown {
  if (typeof body !== 'string') return body;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return body;
  }
}

export async function apiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const session = await secureSession.loadSession();
  if (!session) {
    throw new ApiError(401, 'No hay sesión');
  }

  const method = (init.method ?? 'GET').toUpperCase();
  const url = normalizeApiPath(path);

  try {
    const res = await authedAxios.request<T>({
      url,
      method,
      data: init.body !== undefined ? parseBody(init.body) : undefined,
      skipCompanyHeader: init.skipCompanyHeader,
    });

    if (res.status === 204) {
      return undefined as T;
    }

    if (res.data === '' || res.data === undefined) {
      return undefined as T;
    }

    return res.data as T;
  } catch (e) {
    throw toApiError(e);
  }
}
