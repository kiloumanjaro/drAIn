'use client';

import { useMemo, useState } from 'react';
import ReportCard from './report-card';
import ReportFilters from './report-filters';
import { useAllReports } from '@/lib/query/hooks/use-reports-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/components/context/auth-provider';
import { isAgencyStaff } from '@/lib/supabase/profile';

export default function ReportsTab() {
  // Filter states
  const [priority, setPriority] = useState('all');
  const [status, setStatus] = useState('all');
  const [componentType, setComponentType] = useState('all');
  // Rejected reports (spam, duplicates) are hidden; staff can show them to
  // check or undo a rejection.
  const [showRejected, setShowRejected] = useState(false);
  const { profile } = useAuth();
  const staff = isAgencyStaff(profile);

  // Fetch reports using React Query
  const { data: allReports = [], isLoading: loading, error } = useAllReports();
  const reports = useMemo(
    () =>
      staff && showRejected
        ? allReports
        : allReports.filter((report) => report.reviewStatus !== 'rejected'),
    [allReports, staff, showRejected]
  );

  // Filter and sort reports
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      // Priority filter
      if (priority !== 'all' && report.priority !== priority) return false;

      // Status filter
      if (status !== 'all' && report.status !== status) return false;

      // Component type filter - use category field
      if (componentType !== 'all') {
        if (!report.category || componentType !== report.category) {
          return false;
        }
      }

      return true;
    });
  }, [reports, priority, status, componentType]);

  // Sort by date (newest first)
  const sortedReports = useMemo(() => {
    return [...filteredReports].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [filteredReports]);

  const handleClear = () => {
    setPriority('all');
    setStatus('all');
    setComponentType('all');
  };

  if (error) {
    return (
      <div className="py-8 text-center text-red-600">
        <p>Failed to load reports. Please refresh the page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <ReportFilters
        priority={priority}
        status={status}
        componentType={componentType}
        onPriorityChange={setPriority}
        onStatusChange={setStatus}
        onComponentTypeChange={setComponentType}
        onClear={handleClear}
        filteredCount={sortedReports.length}
        totalCount={reports.length}
      />

      {staff && (
        <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-gray-600">
          <Switch checked={showRejected} onCheckedChange={setShowRejected} />
          Show reports staff rejected
        </label>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-lg border border-[#ced1cd] bg-white"
            >
              <Skeleton className="mb-4 h-40 w-full" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : sortedReports.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-lg text-gray-500">No reports found</p>
          <p className="mt-2 text-sm text-gray-400">
            Try adjusting your filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onPriorityFilter={setPriority}
              onStatusFilter={setStatus}
              onComponentTypeFilter={setComponentType}
            />
          ))}
        </div>
      )}
    </div>
  );
}
