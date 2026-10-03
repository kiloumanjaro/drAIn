import { useQuery } from '@tanstack/react-query';
import { getOverviewMetrics } from '@/lib/dashboard/queries';
import { dashboardKeys } from '@/lib/query/keys';
import type { OverviewMetrics } from '@/lib/dashboard/queries';

export function useOverviewMetrics() {
  return useQuery<OverviewMetrics>({
    queryKey: dashboardKeys.overview(),
    queryFn: getOverviewMetrics,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
