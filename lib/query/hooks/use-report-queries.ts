import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { reportKeys } from '@/lib/query/keys';
import {
  fetchLatestReportsPerComponent,
  fetchReportCountsByComponent,
  fetchReportCountsByDay,
  fetchReportList,
  type Report,
  type ReportList,
} from '@/lib/supabase/report';
import type { DateFilterValue } from '@/components/common/date-sort';
import { dateFilterCutoff } from '@/lib/reports/date-filter';

/**
 * The newest report on each component, for the map's pins. Realtime keeps
 * it current between fetches (components/context/report-provider.tsx).
 */
export function useLatestReports(): UseQueryResult<Report[], Error> {
  return useQuery({
    queryKey: reportKeys.latestPerComponent(),
    queryFn: fetchLatestReportsPerComponent,
    staleTime: 1 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    // Non-staff get no realtime update when a report is rejected (the row
    // stops being readable), so a rejected pin goes at the next refetch.
    refetchInterval: 5 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Reports for one component (or all when none is selected), newest first,
 * within the date filter. Loaded when a list is shown, not up front.
 */
export function useReportList(
  componentId: string | null | undefined,
  dateFilter: DateFilterValue,
  { enabled = true }: { enabled?: boolean } = {}
): UseQueryResult<ReportList, Error> {
  return useQuery({
    enabled,
    queryKey: reportKeys.list(`${componentId ?? '*'}|${dateFilter}`),
    queryFn: () =>
      fetchReportList({ componentId, since: dateFilterCutoff(dateFilter) }),
    placeholderData: keepPreviousData,
    staleTime: 1 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/** Reports filed per day, for the reports toggle's chart. */
export function useReportCountsByDay() {
  return useQuery({
    queryKey: reportKeys.countsByDay(),
    queryFn: fetchReportCountsByDay,
    staleTime: 1 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * How many reports each component has, for the map's bubbles. Kept as fresh
 * as the pins themselves: same refetch interval, and realtime invalidates it
 * whenever a report is filed or changed.
 */
export function useReportCountsByComponent() {
  return useQuery({
    queryKey: reportKeys.countsByComponent(),
    queryFn: fetchReportCountsByComponent,
    staleTime: 1 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

/** Refetch everything report-related that is on screen. */
export function useRefreshReports() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      queryClient.invalidateQueries({ queryKey: reportKeys.all }),
  });
}
