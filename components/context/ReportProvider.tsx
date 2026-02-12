'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  subscribeToReportChanges,
  formatReport,
  Report,
} from '@/lib/supabase/report';
import {
  useAllReports,
  useLatestReports,
  useRefreshReports,
} from '@/lib/query/hooks/useReportQueries';
import { reportKeys } from '@/lib/query/keys';

interface ReportContextType {
  allReports: Report[];
  latestReports: Report[];
  isRefreshingReports: boolean;
  refreshReports: () => Promise<void>;
  notifications: Report[];
  unreadCount: number;
  handleOpenNotifications: () => void;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export function ReportProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Use TanStack Query hooks for data fetching
  const { data: allReports = [], isLoading: isLoadingAll } = useAllReports();
  const { data: latestReports = [], isLoading: isLoadingLatest } =
    useLatestReports();
  const refreshMutation = useRefreshReports();

  const [notifications, setNotifications] = useState<Report[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleOpenNotifications = () => setUnreadCount(0);

  const refreshReports = useCallback(async () => {
    await refreshMutation.mutateAsync();
  }, [refreshMutation]);

  const isRefreshingReports =
    isLoadingAll || isLoadingLatest || refreshMutation.isPending;

  // Subscribe to realtime changes from Supabase
  useEffect(() => {
    const handleInsert = (newReport: Report) => {
      const formatted = formatReport(newReport);

      // Update TanStack Query cache for all reports
      queryClient.setQueryData<Report[]>(reportKeys.list(), (old = []) => [
        formatted,
        ...old,
      ]);

      // Add to notifications
      setNotifications((prev) => [formatted, ...prev]);
      setUnreadCount((c) => c + 1);

      // Invalidate latest reports to recalculate
      queryClient.invalidateQueries({
        queryKey: reportKeys.latestPerComponent(),
      });
    };

    const handleUpdate = (updatedReport: Report) => {
      const formatted = formatReport(updatedReport);

      // Update notifications
      setNotifications((prev) => [
        formatted,
        ...prev.filter((n) => n.id !== formatted.id),
      ]);

      // Update TanStack Query cache for all reports
      queryClient.setQueryData<Report[]>(reportKeys.list(), (old = []) =>
        old.map((r) => (r.id === formatted.id ? formatted : r))
      );

      // Invalidate latest reports to recalculate
      queryClient.invalidateQueries({
        queryKey: reportKeys.latestPerComponent(),
      });
    };

    const unsubscribe = subscribeToReportChanges(handleInsert, handleUpdate);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [queryClient]);

  const value = {
    allReports,
    latestReports,
    isRefreshingReports,
    refreshReports,
    notifications,
    unreadCount,
    handleOpenNotifications,
  };

  return (
    <ReportContext.Provider value={value}>{children}</ReportContext.Provider>
  );
}

export function useReports() {
  const context = useContext(ReportContext);
  if (context === undefined) {
    throw new Error('useReports must be used within a ReportProvider');
  }
  return context;
}
