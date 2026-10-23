import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from './api-error';
import { apiFetch, cambiarEmpresaRequest, fetchEmpresas, loginRequest, logoutRequest } from './api';
import { authedAxios, normalizeApiPath, publicAxios } from './axios-instance';
import { parseErrorMessage, toApiError } from './parse-error';

const mocks = vi.hoisted(() => ({
  loadSession: vi.fn(),
  saveSession: vi.fn(),
  clearSession: vi.fn(),
}));
vi.mock('@/core/config', () => ({ getApiBaseUrl: () => 'http://api.test/v1/api' }));
vi.mock('@/core/session/secure-session', () => mocks);

type Seen = { url?: string; baseURL?: string; method?: string; data?: unknown; headers: AxiosHeaders };
let seen: Seen[] = [];
let reply: (config: InternalAxiosRequestConfig) => { status: number; data: unknown };

function respond(config: InternalAxiosRequestConfig) {
  seen.push({
    url: config.url,
    baseURL: config.baseURL,
    method: config.method,
    data: config.data,
    headers: AxiosHeaders.from(config.headers),
  });
  const r = reply(config);
  if (r.status >= 400) {
    throw new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, undefined, {
      status: r.status,
      statusText: '',
      headers: {},
      data: r.data,
      config,
    });
  }
  return Promise.resolve({ status: r.status, statusText: 'OK', headers: {}, data: r.data, config });
}

const session = {
  accessToken: 'tok',
  refreshToken: 'ref',
  empresaId: 'emp-1',
  needsCompanyPick: false,
  user: { id: 'u1', empresaId: 'emp-1' },
};

beforeEach(() => {
  vi.resetAllMocks();
  seen = [];
  reply = () => ({ status: 200, data: { ok: true } });
  mocks.loadSession.mockResolvedValue(session);
  authedAxios.defaults.adapter = respond;
  publicAxios.defaults.adapter = respond;
});

describe('apiFetch', () => {
  it('resuelve la URL relativa a la base y envía token y empresa', async () => {
    await apiFetch('/productos?pagina=1');
    expect(seen[0].baseURL).toBe('http://api.test/v1/api');
    expect(seen[0].url).toBe('productos?pagina=1');
    expect(seen[0].headers.get('Authorization')).toBe('Bearer tok');
    expect(seen[0].headers.get('X-Company-Id')).toBe('emp-1');
  });

  it('omite X-Company-Id cuando se pide y respeta cabeceras extra', async () => {
    await apiFetch('auth/profile', { skipCompanyHeader: true, headers: { 'Idempotency-Key': 'k1' } });
    expect(seen[0].headers.has('X-Company-Id')).toBe(false);
    expect(seen[0].headers.get('Idempotency-Key')).toBe('k1');
  });

  it('serializa el cuerpo (objeto o string JSON) y normaliza el método', async () => {
    await apiFetch('gastos', { method: 'post', body: { monto: 50000 } });
    await apiFetch('gastos', { method: 'PUT', body: '{"monto":1}' });
    expect(seen[0].method).toBe('post');
    expect(JSON.parse(seen[0].data as string)).toEqual({ monto: 50000 });
    expect(JSON.parse(seen[1].data as string)).toEqual({ monto: 1 });
  });

  it('204 y cuerpo vacío devuelven undefined', async () => {
    reply = () => ({ status: 204, data: '' });
    await expect(apiFetch('x', { method: 'DELETE' })).resolves.toBeUndefined();
    reply = () => ({ status: 200, data: '' });
    await expect(apiFetch('x')).resolves.toBeUndefined();
  });

  it('sin sesión falla con 401 sin llamar a la red', async () => {
    mocks.loadSession.mockResolvedValue(null);
    await expect(apiFetch('x')).rejects.toMatchObject({ status: 401, message: 'No hay sesión' });
    expect(seen).toHaveLength(0);
  });

  it('mapea errores del backend a ApiError con su mensaje', async () => {
    reply = () => ({ status: 422, data: { message: ['monto debe ser positivo', 'fecha inválida'] } });
    const err = await apiFetch('gastos', { method: 'POST', body: {} }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 422, message: 'monto debe ser positivo, fecha inválida' });
  });

  it('un error de red queda con status 0', async () => {
    authedAxios.defaults.adapter = () => Promise.reject(new AxiosError('Network Error', 'ERR_NETWORK'));
    await expect(apiFetch('x')).rejects.toMatchObject({ status: 0, message: 'Network Error' });
  });
});

describe('endpoints de auth', () => {
  it('login envía credenciales sin token y mapea el error', async () => {
    reply = () => ({ status: 200, data: { accessToken: 'a', refreshToken: 'r', user: {} } });
    await loginRequest('ana@vexto.co', 'secreto');
    expect(seen[0].url).toBe('auth/login');
    expect(seen[0].headers.has('Authorization')).toBe(false);
    expect(JSON.parse(seen[0].data as string)).toEqual({ email: 'ana@vexto.co', password: 'secreto' });

    reply = () => ({ status: 401, data: { message: 'Credenciales inválidas' } });
    await expect(loginRequest('a', 'b')).rejects.toMatchObject({ status: 401, message: 'Credenciales inválidas' });
  });

  it('empresas, cambio de empresa y logout usan el token recibido', async () => {
    reply = () => ({ status: 200, data: [] });
    await fetchEmpresas('t1');
    await cambiarEmpresaRequest('t2', 'emp-9');
    await logoutRequest('t3');
    expect(seen.map((s) => [s.url, s.headers.get('Authorization')])).toEqual([
      ['auth/empresas', 'Bearer t1'],
      ['auth/cambiar-empresa', 'Bearer t2'],
      ['auth/logout', 'Bearer t3'],
    ]);
    expect(JSON.parse(seen[1].data as string)).toEqual({ empresaId: 'emp-9' });
  });
});

describe('parse-error', () => {
  it.each([
    [null, ''],
    ['texto plano', 'texto plano'],
    ['{"message":"json en string"}', 'json en string'],
    ['{"message":["a","b"]}', 'a, b'],
    ['{"otro":1}', '{"otro":1}'],
    [{ message: 'objeto' }, 'objeto'],
    [{ message: ['x', 3, 'y'] }, 'x, y'],
    [{ error: 'sin message' }, ''],
  ])('parseErrorMessage(%j) → %j', (input, expected) => {
    expect(parseErrorMessage(input)).toBe(expected);
  });

  it('toApiError conserva ApiError y convierte otros errores', () => {
    const api = new ApiError(409, 'Duplicado');
    expect(toApiError(api)).toBe(api);
    expect(toApiError(new Error('boom'))).toMatchObject({ status: 0, message: 'boom' });
    expect(toApiError('raro')).toMatchObject({ status: 0, message: 'raro' });
  });

  it('normalizeApiPath quita la barra inicial', () => {
    expect(normalizeApiPath('/a/b')).toBe('a/b');
    expect(normalizeApiPath('a')).toBe('a');
  });
});
