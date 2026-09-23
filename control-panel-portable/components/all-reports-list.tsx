'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Report } from '@/lib/supabase/report';
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SpinnerEmpty } from '@/components/spinner-empty';
import { format, subWeeks, subMonths, startOfDay } from 'date-fns';
import type { DateFilterValue } from './date-sort';
import { RefreshCw } from 'lucide-react';
import type {
  Inlet,
  Outlet,
  Pipe,
  Drain,
} from '@/components/control-panel/types';

interface AllReportsListProps {
  dateFilter?: DateFilterValue;
  reports?: Report[];
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
  isSimulationMode?: boolean;
  selectedInlet?: Inlet | null;
  selectedOutlet?: Outlet | null;
  selectedPipe?: Pipe | null;
  selectedDrain?: Drain | null;
}

export default function AllReportsList({
  dateFilter = 'all',
  reports = [],
  onRefresh,
  isRefreshing = false,
  isSimulationMode = false,
  selectedInlet = null,
  selectedOutlet = null,
  selectedPipe = null,
  selectedDrain = null,
}: AllReportsListProps) {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'unresolved':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
    }
  };

  // Filter reports based on date filter
  const filteredReports = useMemo(() => {
    let filtered = reports;

    const selectedId =
      selectedInlet?.id ||
      selectedOutlet?.id ||
      selectedPipe?.id ||
      selectedDrain?.id;

    if (selectedId) {
      filtered = filtered.filter((report) => report.componentId === selectedId);
    }

    if (dateFilter === 'all') {
      return filtered;
    }

    const now = new Date();
    let cutoffDate: Date;

    switch (dateFilter) {
      case 'today':
        cutoffDate = startOfDay(now);
        break;
      case 'week':
        cutoffDate = subWeeks(now, 1);
        break;
      case '2weeks':
        cutoffDate = subWeeks(now, 2);
        break;
      case '3weeks':
        cutoffDate = subWeeks(now, 3);
        break;
      case 'month':
        cutoffDate = subMonths(now, 1);
        break;
      default:
        return reports;
    }

    return filtered.filter((report) => new Date(report.date) >= cutoffDate);
  }, [
    reports,
    dateFilter,
    selectedInlet,
    selectedOutlet,
    selectedPipe,
    selectedDrain,
  ]);

  if (isRefreshing) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <SpinnerEmpty
          emptyTitle="Refreshing reports"
          emptyDescription="Please wait while we fetch the latest reports."
        />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-6 pt-3 pr-3 pb-5 pl-5">
      <CardHeader className="flex items-center justify-between px-1 py-0">
        <div className="flex flex-col gap-1.5">
          <CardTitle>All Reports</CardTitle>
          <CardDescription className="text-xs">
            Submitted reports from the community
          </CardDescription>
        </div>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#DCDCDC] bg-[#EBEBEB] transition-colors hover:bg-[#E0E0E0] disabled:cursor-not-allowed disabled:opacity-50"
          title="Refresh reports"
        >
          <RefreshCw
            className={`h-4 w-4 cursor-pointer text-[#8D8D8D] ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          />
        </button>
      </CardHeader>

      <ScrollArea className="relative flex-1">
        {filteredReports.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-muted-foreground rounded px-4 py-8 pb-25 text-center text-sm">
              {isSimulationMode
                ? 'Reports are not visible in simulation mode'
                : 'No reports found for the selected time period.'}
            </div>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="hover:bg-accent flex flex-row gap-3 rounded-lg border p-3 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Image Thumbnail with Badges */}
                  {report.image ? (
                    <Image
                      src={report.image}
                      alt={report.category}
                      width={80}
                      height={80}
                      className="h-25 w-21 rounded object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded bg-gray-100 text-xs text-gray-400">
                      No image
                    </div>
                  )}

                  {/* Report Details */}
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <div className="flex-1">
                      {/* Description */}
                      <p className="text-foreground mb-2 line-clamp-2 text-sm">
                        {report.description}
                      </p>

                      {/* Metadata */}
                      <div className="text-muted-foreground flex flex-col gap-1 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">
                            {report.reporterName || 'Anonymous'}
                          </span>
                          <span>on</span>
                          <span>{report.componentId}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>
                            {format(new Date(report.date), 'MMM dd, yyyy')}
                          </span>
                          {/*Apply Geocoding Here */}
                          <span>{report.address}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row gap-2">
                      <Badge
                        variant="outline"
                        className="h-5 justify-center px-3 py-0 text-[10px] font-normal"
                      >
                        {report.category}
                      </Badge>
                      <div
                        className={`flex h-5 items-center justify-center rounded-md border px-3 py-0.5 text-[10px] ${getStatusStyle(
                          report.status
                        )}`}
                      >
                        {report.status}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
