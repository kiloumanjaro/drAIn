import type { QueryClient } from '@tanstack/react-query';
import { dashboardKeys, reportKeys } from '@/lib/query/keys';

/**
 * The dashboard's Refresh button: refetch the overview cards, the charts and
 * the report cards together, not only the overview.
 */
export function refreshDashboard(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
    queryClient.invalidateQueries({ queryKey: reportKeys.all }),
  ]);
}
