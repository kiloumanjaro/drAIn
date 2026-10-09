import { useQueries } from '@tanstack/react-query';
import {
  getIssuesPerZone,
  getComponentTypeData,
  getRepairTimeByComponent,
  getReportLocations,
} from '@/lib/dashboard/queries';
import { dashboardKeys } from '@/lib/query/keys';
import type {
  ZoneIssueData,
  ComponentTypeData,
  RepairTimeByComponentData,
  ReportLocation,
} from '@/lib/dashboard/queries';

const staleTime = 5 * 60 * 1000; // 5 minutes
const gcTime = 10 * 60 * 1000; // 10 minutes

interface AnalyticsData {
  zoneData: ZoneIssueData[];
  componentData: ComponentTypeData[];
  repairTimeData: RepairTimeByComponentData[];
  /** Every report's position, for the heatmap. */
  reportLocations: ReportLocation[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Compound hook that fetches all analytics data in parallel
 * Returns unified loading and error states
 */
export function useAnalytics(): AnalyticsData {
  const results = useQueries({
    queries: [
      {
        queryKey: dashboardKeys.analyticsDetails().issuesPerZone(),
        queryFn: getIssuesPerZone,
        staleTime,
        gcTime,
      },
      {
        queryKey: dashboardKeys.analyticsDetails().componentTypes(),
        queryFn: getComponentTypeData,
        staleTime,
        gcTime,
      },
      {
        queryKey: dashboardKeys.analyticsDetails().repairTimeByComponent(),
        queryFn: getRepairTimeByComponent,
        staleTime,
        gcTime,
      },
      {
        queryKey: dashboardKeys.analyticsDetails().reportLocations(),
        queryFn: getReportLocations,
        staleTime,
        gcTime,
      },
    ],
  });

  const isLoading = results.some((result) => result.isLoading);
  const error = results.find((result) => result.error)?.error || null;

  return {
    zoneData: (results[0].data as ZoneIssueData[]) || [],
    componentData: (results[1].data as ComponentTypeData[]) || [],
    repairTimeData: (results[2].data as RepairTimeByComponentData[]) || [],
    reportLocations: (results[3].data as ReportLocation[]) || [],
    isLoading,
    error: error as Error | null,
  };
}
