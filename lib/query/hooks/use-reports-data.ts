import { useQuery } from '@tanstack/react-query';
import { getAllReports } from '@/lib/dashboard/queries';
import { dashboardKeys } from '@/lib/query/keys';
import type { ReportWithMetadata } from '@/lib/dashboard/queries';

export function useAllReports() {
  return useQuery<ReportWithMetadata[]>({
    queryKey: dashboardKeys.reportsDetails().all(),
    queryFn: getAllReports,
    // Reports change more frequently than analytics data
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
