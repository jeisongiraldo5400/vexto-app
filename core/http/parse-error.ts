import { isAxiosError } from 'axios';

import { ApiError } from './api-error';

function textOf(m: unknown): string {
  if (Array.isArray(m)) return m.filter((x): x is string => typeof x === 'string').join(', ');
  return typeof m === 'string' ? m : '';
}

function parseJson(data: unknown): unknown {
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data) as unknown;
  } catch {
    return data;
  }
}

/**
 * Texto del error. `message` puede ser un string, una lista de validaciones o el
 * objeto anidado del filtro global (`{ code, message }` / `{ message: string[] }`).
 */
export function parseErrorMessage(data: unknown): string {
  if (data == null) return '';
  const body = parseJson(data);
  if (typeof body === 'string') return body;
  // JSON en texto sin `message` utilizable: se muestra tal cual llegó.
  const fallback = typeof data === 'string' ? data : '';
  if (!body || typeof body !== 'object' || !('message' in body)) return fallback;
  const m = (body as { message?: unknown }).message;
  if (m && typeof m === 'object' && !Array.isArray(m)) {
    return textOf((m as { message?: unknown }).message) || fallback;
  }
  return textOf(m) || fallback;
}

/** `code` estable y campos extra de un error de negocio (`body.message.code`). */
export function parseErrorCode(data: unknown): { code?: string; details?: Record<string, unknown> } {
  const body = parseJson(data);
  if (!body || typeof body !== 'object') return {};
  const m = (body as { message?: unknown }).message;
  if (!m || typeof m !== 'object' || Array.isArray(m)) return {};
  const { code, ...details } = m as Record<string, unknown>;
  return typeof code === 'string' ? { code, details } : {};
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const msg =
      parseErrorMessage(error.response?.data) ||
      (typeof error.message === 'string' ? error.message : '') ||
      'Error';
    return new ApiError(status, msg, parseErrorCode(error.response?.data));
  }
  if (error instanceof Error) return new ApiError(0, error.message);
  return new ApiError(0, String(error));
}
