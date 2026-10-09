'use client';

import { useState } from 'react';
import ReportCard from './report-card';
import ReportFilters from './report-filters';
import { useReportsPage } from '@/lib/query/hooks/use-reports-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/context/auth-provider';
import { isAgencyStaff } from '@/lib/supabase/profile';

/** Cards loaded at first, and added by each "Show more". */
const PAGE_SIZE = 24;

export default function ReportsTab() {
  // Filter states
  const [priority, setPriority] = useState('all');
  const [status, setStatus] = useState('all');
  const [componentType, setComponentType] = useState('all');
  // Rejected reports (spam, duplicates) are hidden; staff can show them to
  // check or undo a rejection.
  const [showRejected, setShowRejected] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const { profile } = useAuth();
  const staff = isAgencyStaff(profile);

  // Filtered, sorted and counted in the database, a page at a time.
  const { data, isLoading, isFetching, error } = useReportsPage(
    {
      priority,
      status,
      componentType,
      includeRejected: staff && showRejected,
      withPhotoDetails: staff,
    },
    limit
  );
  const reports = data?.reports ?? [];

  // A new filter starts again from the first page.
  const filterBy =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setLimit(PAGE_SIZE);
    };

  const handleClear = () => {
    setPriority('all');
    setStatus('all');
    setComponentType('all');
    setLimit(PAGE_SIZE);
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
        onPriorityChange={filterBy(setPriority)}
        onStatusChange={filterBy(setStatus)}
        onComponentTypeChange={filterBy(setComponentType)}
        onClear={handleClear}
        filteredCount={data?.matching ?? 0}
        totalCount={data?.total ?? 0}
      />

      {staff && (
        <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-gray-600">
          <Switch
            checked={showRejected}
            onCheckedChange={filterBy(setShowRejected)}
          />
          Show reports staff rejected
        </label>
      )}

      {/* Loading State */}
      {isLoading ? (
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
      ) : reports.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-lg text-gray-500">No reports found</p>
          <p className="mt-2 text-sm text-gray-400">
            Try adjusting your filters
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onPriorityFilter={filterBy(setPriority)}
                onStatusFilter={filterBy(setStatus)}
                onComponentTypeFilter={filterBy(setComponentType)}
              />
            ))}
          </div>
          {(data?.matching ?? 0) > reports.length && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                disabled={isFetching}
                onClick={() => setLimit((n) => n + PAGE_SIZE)}
              >
                {isFetching
                  ? 'Loading…'
                  : `Show more (${reports.length} of ${data?.matching})`}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
