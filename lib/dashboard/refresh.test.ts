import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { dashboardKeys, reportKeys } from '@/lib/query/keys';
import { refreshDashboard } from './refresh';

describe('refreshDashboard', () => {
  it('invalidates every dashboard query and every report query', async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    await refreshDashboard(queryClient);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: dashboardKeys.all });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: reportKeys.all });
    expect(invalidate).toHaveBeenCalledTimes(2);
  });
});
