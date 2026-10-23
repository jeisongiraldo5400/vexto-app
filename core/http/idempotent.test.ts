import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from './api-error';
import { newIdempotencyIntent, postIdempotent } from './idempotent';

const { apiFetch, loadSession } = vi.hoisted(() => ({ apiFetch: vi.fn(), loadSession: vi.fn() }));
vi.mock('@/core/http/api', () => ({ apiFetch }));
vi.mock('@/core/session/secure-session', () => ({ loadSession }));

const key = (call: number) => apiFetch.mock.calls[call][1].headers['Idempotency-Key'];
const pago = { monto: 50000, metodoPagoId: 'efectivo' };

beforeEach(() => {
  vi.resetAllMocks();
  loadSession.mockResolvedValue({ user: { id: 'u' }, empresaId: 'e' });
});

describe('postIdempotent', () => {
  it('dos pagos idénticos de intenciones distintas llevan claves distintas, aunque el primero haya fallado', async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(0, 'Red')).mockResolvedValue({});
    const first = newIdempotencyIntent();
    await expect(postIdempotent('reparaciones/1/pagos', pago, first)).rejects.toThrow('Red');
    await postIdempotent('reparaciones/1/pagos', pago, newIdempotencyIntent());
    expect(key(1)).not.toBe(key(0));
  });

  it('el reintento de la misma intención tras un error de red conserva la clave', async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(0, 'Red')).mockResolvedValue({});
    const intent = newIdempotencyIntent();
    await expect(postIdempotent('reparaciones/1/pagos', pago, intent)).rejects.toThrow();
    await postIdempotent('reparaciones/1/pagos', pago, intent);
    expect(key(1)).toBe(key(0));
  });

  it('un 5xx también conserva la clave para reintentar', async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(503, 'Caído')).mockResolvedValue({});
    const intent = newIdempotencyIntent();
    await expect(postIdempotent('p', pago, intent)).rejects.toThrow();
    await postIdempotent('p', pago, intent);
    expect(key(1)).toBe(key(0));
  });

  it('un 4xx definitivo descarta la clave', async () => {
    apiFetch.mockRejectedValueOnce(new ApiError(400, 'Monto inválido')).mockResolvedValue({});
    const intent = newIdempotencyIntent();
    await expect(postIdempotent('p', pago, intent)).rejects.toThrow();
    await postIdempotent('p', pago, intent);
    expect(key(1)).not.toBe(key(0));
  });

  it('la misma intención tras un éxito obtiene una clave nueva', async () => {
    apiFetch.mockResolvedValue({});
    const intent = newIdempotencyIntent();
    await postIdempotent('p', pago, intent);
    await postIdempotent('p', pago, intent);
    expect(key(1)).not.toBe(key(0));
  });
});

describe('postIdempotent: errores reintentables', () => {
  it.each([408, 425, 429])('%d conserva la clave', async (status) => {
    apiFetch.mockRejectedValueOnce(new ApiError(status, 'Reintenta')).mockResolvedValue({});
    const intent = newIdempotencyIntent();
    await expect(postIdempotent('p', pago, intent)).rejects.toThrow();
    await postIdempotent('p', pago, intent);
    expect(key(1)).toBe(key(0));
  });

  it('un error que no es ApiError (timeout de axios sin mapear) conserva la clave', async () => {
    apiFetch.mockRejectedValueOnce(new Error('timeout')).mockResolvedValue({});
    const intent = newIdempotencyIntent();
    await expect(postIdempotent('p', pago, intent)).rejects.toThrow();
    await postIdempotent('p', pago, intent);
    expect(key(1)).toBe(key(0));
  });

  it('envía POST con el cuerpo intacto y clave con prefijo móvil', async () => {
    apiFetch.mockResolvedValue({ id: 'x' });
    await expect(postIdempotent('gastos', pago, newIdempotencyIntent())).resolves.toEqual({ id: 'x' });
    expect(apiFetch).toHaveBeenCalledWith('gastos', {
      method: 'POST',
      body: pago,
      headers: { 'Idempotency-Key': expect.stringMatching(/^mobile-/) },
    });
  });
});
