import axios from 'axios';

import { ApiError } from './api-error';

export function parseErrorMessage(data: unknown): string {
  if (data == null) return '';
  if (typeof data === 'string') {
    try {
      const j = JSON.parse(data) as { message?: string | string[] };
      if (Array.isArray(j.message)) return j.message.join(', ');
      if (typeof j.message === 'string') return j.message;
    } catch {
      return data;
    }
    return data;
  }
  if (typeof data === 'object' && 'message' in (data as object)) {
    const m = (data as { message?: unknown }).message;
    if (Array.isArray(m)) return m.filter((x): x is string => typeof x === 'string').join(', ');
    if (typeof m === 'string') return m;
  }
  return '';
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const msg =
      parseErrorMessage(error.response?.data) ||
      (typeof error.message === 'string' ? error.message : '') ||
      'Error';
    return new ApiError(status, msg);
  }
  if (error instanceof Error) return new ApiError(0, error.message);
  return new ApiError(0, String(error));
}
