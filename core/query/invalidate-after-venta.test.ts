import { describe, expect, it, vi } from 'vitest';

import { homeQueryKeys } from '@/admin/home/hooks/query-keys';
import type { QueryClient } from '@tanstack/react-query';

import { invalidateAfterVenta } from './invalidate-after-venta';

describe('invalidateAfterVenta', () => {
  it('invalida dashboard, stock y productos', () => {
    const invalidateQueries = vi.fn(async () => {});
    invalidateAfterVenta({ invalidateQueries } as unknown as QueryClient);
    expect(invalidateQueries.mock.calls.map((c) => (c as unknown as [{ queryKey: unknown }])[0].queryKey)).toEqual([
      homeQueryKeys.all,
      ['stock'],
      ['productos'],
    ]);
  });
});
