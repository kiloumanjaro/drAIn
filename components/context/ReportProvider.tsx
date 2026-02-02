'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import {
  subscribeToReportChanges,
  fetchAllReports,
  fetchLatestReportsPerComponent,
  formatReport,
  Report,
} from '@/lib/supabase/report';

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
  const [allReports, setAllReports] = useState<Report[]>([]);
  const [latestReports, setLatestReports] = useState<Report[]>([]);
  const [isRefreshingReports, setIsRefreshingReports] = useState(false);
  const [notifications, setNotifications] = useState<Report[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleOpenNotifications = () => setUnreadCount(0);

  const refreshReports = useCallback(async () => {
    setIsRefreshingReports(true);
    try {
      const fetchedAllReports = await fetchAllReports();
      setAllReports(fetchedAllReports);
      const latest = await fetchLatestReportsPerComponent(fetchedAllReports);
      setLatestReports(latest);
    } catch (err) {
      console.error('Failed to refresh reports in provider:', err);
    } finally {
      setIsRefreshingReports(false);
    }
  }, []);

  useEffect(() => {
    refreshReports();

    const handleInsert = (newReport: Report) => {
      const formatted = formatReport(newReport);

      setAllReports((prev) => [formatted, ...prev]);
      setNotifications((prev) => [formatted, ...prev]);
      setUnreadCount((c) => c + 1);

      setLatestReports((prev) => {
        const newLatestMap = new Map(prev.map((r) => [r.componentId, r]));
        const existing = newLatestMap.get(formatted.componentId);
        if (!existing || new Date(formatted.date) > new Date(existing.date)) {
          newLatestMap.set(formatted.componentId, formatted);
        }
        return Array.from(newLatestMap.values());
      });
    };

    const handleUpdate = (updatedReport: Report) => {
      const formatted = formatReport(updatedReport);

      setNotifications((prev) => [
        formatted,
        ...prev.filter((n) => n.id !== formatted.id),
      ]);

      setAllReports((prevAllReports) => {
        const updatedAllReports = prevAllReports.map((r) =>
          r.id === formatted.id ? formatted : r
        );

        const latestFromUpdated = new Map<string, Report>();
        for (const report of updatedAllReports) {
          const existing = latestFromUpdated.get(report.componentId);
          if (!existing || new Date(report.date) > new Date(existing.date)) {
            latestFromUpdated.set(report.componentId, report);
          }
        }

        setLatestReports(Array.from(latestFromUpdated.values()));

        return updatedAllReports;
      });
    };

    const unsubscribe = subscribeToReportChanges(handleInsert, handleUpdate);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [refreshReports]);

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
