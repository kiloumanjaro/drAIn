import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getReportsPage, type ReportFilter } from '@/lib/dashboard/queries';
import { dashboardKeys } from '@/lib/query/keys';

/** One filtered page of the dashboard's reports tab; see getReportsPage. */
export function useReportsPage(filter: ReportFilter, limit: number) {
  return useQuery({
    queryKey: dashboardKeys.reportsDetails().page(filter, limit),
    queryFn: () => getReportsPage(filter, limit),
    // Keep showing the current cards while a filter change or "Show more"
    // loads.
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
