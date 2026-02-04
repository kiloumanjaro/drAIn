import { useQuery } from '@tanstack/react-query';
import {
  getRepairTrendData,
  getIssuesPerZone,
  getComponentTypeData,
  getRepairTimeByComponent,
} from '@/lib/dashboard/queries';
import { dashboardKeys } from '@/lib/query/keys';
import type {
  RepairTrendData,
  ZoneIssueData,
  ComponentTypeData,
  RepairTimeByComponentData,
} from '@/lib/dashboard/queries';

const staleTime = 5 * 60 * 1000; // 5 minutes
const gcTime = 10 * 60 * 1000; // 10 minutes

export function useRepairTrendData() {
  return useQuery<RepairTrendData[]>({
    queryKey: dashboardKeys.analyticsDetails().repairTrend(),
    queryFn: getRepairTrendData,
    staleTime,
    gcTime,
  });
}

export function useIssuesPerZone() {
  return useQuery<ZoneIssueData[]>({
    queryKey: dashboardKeys.analyticsDetails().issuesPerZone(),
    queryFn: getIssuesPerZone,
    staleTime,
    gcTime,
  });
}

export function useComponentTypeData() {
  return useQuery<ComponentTypeData[]>({
    queryKey: dashboardKeys.analyticsDetails().componentTypes(),
    queryFn: getComponentTypeData,
    staleTime,
    gcTime,
  });
}

export function useRepairTimeByComponent() {
  return useQuery<RepairTimeByComponentData[]>({
    queryKey: dashboardKeys.analyticsDetails().repairTimeByComponent(),
    queryFn: getRepairTimeByComponent,
    staleTime,
    gcTime,
  });
}
