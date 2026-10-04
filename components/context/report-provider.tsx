'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  subscribeToReportChanges,
  formatReport,
  Report,
  type ReportRow,
} from '@/lib/supabase/report';
import {
  useLatestReports,
  useRefreshReports,
} from '@/lib/query/hooks/use-report-queries';
import { reportKeys } from '@/lib/query/keys';
import { mergeLatestReport } from '@/lib/reports/latest';

interface ReportContextType {
  /** The newest report on each component: what the map's pins show. */
  latestReports: Report[];
  isRefreshingReports: boolean;
  refreshReports: () => Promise<void>;
  notifications: Report[];
  unreadCount: number;
  handleOpenNotifications: () => void;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

/** Fallback while loading: one array, so the map doesn't redraw every render. */
const NO_REPORTS: Report[] = [];

export function ReportProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: latestReports = NO_REPORTS, isLoading: isLoadingLatest } =
    useLatestReports();
  // Taken apart because the mutation object is new on every render, while
  // mutateAsync stays the same function.
  const { mutateAsync: refreshAll, isPending: isRefreshPending } =
    useRefreshReports();

  const [notifications, setNotifications] = useState<Report[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleOpenNotifications = useCallback(() => setUnreadCount(0), []);

  const refreshReports = useCallback(async () => {
    await refreshAll();
  }, [refreshAll]);

  const isRefreshingReports = isLoadingLatest || isRefreshPending;

  // Realtime: move just the changed component's pin, and let any open list
  // or count refetch.
  useEffect(() => {
    const applyChange = (row: ReportRow) => {
      const formatted = formatReport(row);
      const latest = queryClient.getQueryData<Report[]>(
        reportKeys.latestPerComponent()
      );
      const merged = latest ? mergeLatestReport(latest, formatted) : latest;
      if (merged === null) {
        queryClient.invalidateQueries({
          queryKey: reportKeys.latestPerComponent(),
        });
      } else if (merged !== latest) {
        queryClient.setQueryData(reportKeys.latestPerComponent(), merged);
      }
      queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
      queryClient.invalidateQueries({ queryKey: reportKeys.countsByDay() });
      return formatted;
    };

    const handleInsert = (row: ReportRow) => {
      const formatted = applyChange(row);
      setNotifications((prev) => [formatted, ...prev]);
      setUnreadCount((c) => c + 1);
    };

    const handleUpdate = (row: ReportRow) => {
      const formatted = applyChange(row);
      const rejected = formatted.reviewStatus === 'rejected';
      setNotifications((prev) => [
        ...(rejected ? [] : [formatted]),
        ...prev.filter((n) => n.id !== formatted.id),
      ]);
    };

    const unsubscribe = subscribeToReportChanges(handleInsert, handleUpdate);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [queryClient]);

  // One object until something in it changes, so the map and the
  // notification bell re-render for report changes only.
  const value = useMemo(
    () => ({
      latestReports,
      isRefreshingReports,
      refreshReports,
      notifications,
      unreadCount,
      handleOpenNotifications,
    }),
    [
      latestReports,
      isRefreshingReports,
      refreshReports,
      notifications,
      unreadCount,
      handleOpenNotifications,
    ]
  );

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
