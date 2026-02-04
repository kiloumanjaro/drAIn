import { useQueries } from '@tanstack/react-query';
import {
  getRepairTrendData,
  getIssuesPerZone,
  getComponentTypeData,
  getRepairTimeByComponent,
  getAllReports,
} from '@/lib/dashboard/queries';
import { dashboardKeys } from '@/lib/query/keys';
import type {
  RepairTrendData,
  ZoneIssueData,
  ComponentTypeData,
  RepairTimeByComponentData,
  ReportWithMetadata,
} from '@/lib/dashboard/queries';

const staleTime = 5 * 60 * 1000; // 5 minutes
const gcTime = 10 * 60 * 1000; // 10 minutes

interface AnalyticsData {
  trendData: RepairTrendData[];
  zoneData: ZoneIssueData[];
  componentData: ComponentTypeData[];
  repairTimeData: RepairTimeByComponentData[];
  allReports: ReportWithMetadata[];
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
        queryKey: dashboardKeys.analyticsDetails().repairTrend(),
        queryFn: getRepairTrendData,
        staleTime,
        gcTime,
      },
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
        queryKey: dashboardKeys.analyticsDetails().allReports(),
        queryFn: getAllReports,
        staleTime,
        gcTime,
      },
    ],
  });

  const isLoading = results.some(result => result.isLoading);
  const error = results.find(result => result.error)?.error || null;

  return {
    trendData: (results[0].data as RepairTrendData[]) || [],
    zoneData: (results[1].data as ZoneIssueData[]) || [],
    componentData: (results[2].data as ComponentTypeData[]) || [],
    repairTimeData: (results[3].data as RepairTimeByComponentData[]) || [],
    allReports: (results[4].data as ReportWithMetadata[]) || [],
    isLoading,
    error: error as Error | null,
  };
}
