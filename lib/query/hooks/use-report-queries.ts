import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { reportKeys } from '@/lib/query/keys';
import {
  getAllReports,
  getLatestReportsPerComponent,
} from '@/lib/reports/queries';
import type { Report } from '@/lib/supabase/report';

/**
 * Fetch all reports with TanStack Query
 * Cached for 2 minutes, stale after 1 minute
 */
export function useAllReports(): UseQueryResult<Report[], Error> {
  return useQuery({
    queryKey: reportKeys.list(),
    queryFn: getAllReports,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

/**
 * Fetch latest reports per component
 * Depends on allReports being loaded first
 */
export function useLatestReports(): UseQueryResult<Report[], Error> {
  const { data: allReports } = useAllReports();

  return useQuery({
    queryKey: reportKeys.latestPerComponent(),
    queryFn: () => getLatestReportsPerComponent(allReports),
    enabled: !!allReports && allReports.length > 0,
    staleTime: 1 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Mutation to refresh all report data
 * Invalidates both all reports and latest reports
 */
export function useRefreshReports() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Invalidate and refetch both queries
      await queryClient.invalidateQueries({
        queryKey: reportKeys.list(),
      });
      await queryClient.invalidateQueries({
        queryKey: reportKeys.latestPerComponent(),
      });
    },
  });
}
