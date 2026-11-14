import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/core/http/api', () => ({ apiFetch: vi.fn() }));
vi.mock('@/core/session/secure-session', () => ({ loadSession: vi.fn() }));

import { previewCuotas } from '@/admin/sales/adapters/credito.adapter';

import { toLocalYmd } from './date';

afterEach(() => vi.useRealTimers());

describe('toLocalYmd', () => {
  it('usa el día local aunque en UTC ya sea el día siguiente', () => {
    expect(toLocalYmd(new Date(2026, 9, 10, 23, 30))).toBe('2026-10-10');
    expect(toLocalYmd(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05');
  });
});

describe('previewCuotas', () => {
  it('calcula las fechas con el día local', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 10, 21, 0));
    const cuotas = previewCuotas(1000, 100, 2, 30);
    expect(cuotas.map((c) => c.fecha)).toEqual(['2026-10-10', '2026-11-09', '2026-12-09']);
  });
});
