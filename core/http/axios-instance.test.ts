import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authedAxios, publicAxios } from './axios-instance';

const mocks = vi.hoisted(() => ({
  loadSession: vi.fn(), saveSession: vi.fn(), clearSession: vi.fn(),
  syncFromStorage: vi.fn(), clearLocal: vi.fn(),
}));
vi.mock('@/core/config', () => ({ getApiBaseUrl: () => 'http://localhost/v1/api/' }));
vi.mock('@/core/session/secure-session', () => mocks);
vi.mock('./auth-bridge', () => ({ authHttpBridge: mocks }));

const initial = {
  accessToken: 'a1', refreshToken: 'r1', empresaId: 'e1', needsCompanyPick: true,
  user: { id: 'u1', empresaId: 'e1' },
};

function unauthorized(config: InternalAxiosRequestConfig) {
  return new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
    status: 401, statusText: 'Unauthorized', headers: {}, data: {}, config,
  });
}

describe('Renovación de la sesión móvil', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
    let session: typeof initial | null = { ...initial };
    mocks.loadSession.mockImplementation(async () => session);
    mocks.saveSession.mockImplementation(async (next) => { session = next; });
    mocks.clearSession.mockImplementation(async () => { session = null; });
    authedAxios.defaults.adapter = async (config) => {
      if (AxiosHeaders.from(config.headers).get('Authorization') === 'Bearer a1') throw unauthorized(config);
      return { status: 200, statusText: 'OK', headers: {}, data: 'ok', config };
    };
  });

  it('comparte una sola renovación entre varias respuestas 401', async () => {
    let complete!: (value: { data: unknown }) => void;
    const refresh = vi.spyOn(publicAxios, 'post').mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
    const requests = [authedAxios.get('products'), authedAxios.get('sales'), authedAxios.get('stock')];
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    complete({ data: { accessToken: 'a2', refreshToken: 'r2', user: initial.user } });
    expect((await Promise.all(requests)).map((r) => r.data)).toEqual(['ok', 'ok', 'ok']);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(mocks.saveSession).toHaveBeenCalledWith(expect.objectContaining({ needsCompanyPick: true }));
    expect(mocks.clearSession).not.toHaveBeenCalled();
  });

  it('reintenta un 401 tardío con el token renovado sin volver a rotarlo', async () => {
    let late!: () => void;
    authedAxios.defaults.adapter = async (config) => {
      if (AxiosHeaders.from(config.headers).get('Authorization') === 'Bearer a1') {
        if (config.url === 'late') await new Promise<void>((resolve) => { late = resolve; });
        throw unauthorized(config);
      }
      return { status: 200, statusText: 'OK', headers: {}, data: 'ok', config };
    };
    const refresh = vi.spyOn(publicAxios, 'post').mockResolvedValue({ data: { accessToken: 'a2', refreshToken: 'r2', user: initial.user } });
    const slow = authedAxios.get('late');
    await vi.waitFor(() => expect(late).toBeDefined());
    await authedAxios.get('fast');
    late();
    await slow;
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('limpia una sola vez si el refresh fue revocado', async () => {
    vi.spyOn(publicAxios, 'post').mockRejectedValue(unauthorized({ headers: new AxiosHeaders() } as InternalAxiosRequestConfig));
    const result = await Promise.allSettled([authedAxios.get('products'), authedAxios.get('sales')]);
    expect(result.every((r) => r.status === 'rejected')).toBe(true);
    expect(mocks.clearSession).toHaveBeenCalledTimes(1);
    expect(mocks.clearLocal).toHaveBeenCalledTimes(1);
  });

  it('conserva la sesión cuando la renovación falla por red', async () => {
    vi.spyOn(publicAxios, 'post').mockRejectedValue(new AxiosError('offline', 'ERR_NETWORK'));
    await expect(authedAxios.get('products')).rejects.toThrow();
    expect(mocks.clearSession).not.toHaveBeenCalled();
  });

  it('no restaura la sesión si se cerró mientras renovaba', async () => {
    vi.spyOn(publicAxios, 'post').mockImplementation(async () => {
      await mocks.clearSession();
      return { data: { accessToken: 'a2', refreshToken: 'r2', user: initial.user } };
    });
    await expect(authedAxios.get('products')).rejects.toThrow();
    expect(mocks.saveSession).not.toHaveBeenCalled();
  });
});
