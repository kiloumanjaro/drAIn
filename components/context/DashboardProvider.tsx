'use client';

import React, { createContext, useContext } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOverviewMetrics } from '@/lib/query/hooks/useOverviewMetrics';
import { dashboardKeys } from '@/lib/query/keys';
import type { OverviewMetrics } from '@/lib/dashboard/queries';

interface DashboardContextType {
  metrics: OverviewMetrics | undefined;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  isRefreshing: boolean;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { data: metrics, isLoading, error } = useOverviewMetrics();

  const refreshMutation = useMutation({
    mutationFn: async () => {
      // Invalidate all dashboard queries
      await queryClient.invalidateQueries({
        queryKey: dashboardKeys.all,
      });
      // Refetch overview metrics
      await queryClient.refetchQueries({
        queryKey: dashboardKeys.overview(),
      });
    },
  });

  const value: DashboardContextType = {
    metrics,
    isLoading,
    error: error as Error | null,
    refresh: () => refreshMutation.mutateAsync(),
    isRefreshing: refreshMutation.isPending,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
}
