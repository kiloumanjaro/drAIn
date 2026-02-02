'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import type { Report as SupabaseReport } from '@/lib/supabase/report'; // Renamed to avoid conflict
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SpinnerEmpty } from '@/components/spinner-empty';
import { format, subWeeks, subMonths, startOfDay } from 'date-fns';
import type { DateFilterValue } from './date-sort';
import {
  RefreshCw,
  MapPin,
  History,
  ArrowLeftRight,
  ArrowRight,
} from 'lucide-react';
import type {
  Inlet,
  Outlet,
  Pipe,
  Drain,
} from '@/components/control-panel/types';
import { ImageViewer } from '@/components/image-viewer'; // Import ImageViewer

interface Report extends SupabaseReport {
  coordinates: [number, number];
}

interface ReportHistoryListProps {
  dateFilter?: DateFilterValue;
  reports?: Report[]; // Use the extended Report interface
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
  isSimulationMode?: boolean;
  selectedInlet?: Inlet | null;
  selectedOutlet?: Outlet | null;
  selectedPipe?: Pipe | null;
  selectedDrain?: Drain | null;
}

const getComponentDisplayName = (
  selectedInlet?: Inlet | null,
  selectedOutlet?: Outlet | null,
  selectedPipe?: Pipe | null,
  selectedDrain?: Drain | null
) => {
  if (selectedInlet) return `Inlet ${selectedInlet.id}`;
  if (selectedOutlet) return `Outlet ${selectedOutlet.id}`;
  if (selectedPipe) return `Pipe ${selectedPipe.id}`;
  if (selectedDrain) return `Storm Drain ${selectedDrain.id}`;
  return 'Report History';
};

export default function ReportHistoryList({
  dateFilter = 'all',
  reports = [],
  onRefresh,
  isRefreshing = false,
  isSimulationMode = false,
  selectedInlet = null,
  selectedOutlet = null,
  selectedPipe = null,
  selectedDrain = null,
}: ReportHistoryListProps) {
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [swappedReports, setSwappedReports] = useState<Set<string>>(new Set());

  const handleReportClick = (report: Report) => {
    setSelectedReport(report);
    setShowImageViewer(true);
  };

  const handleToggleImage = (e: React.MouseEvent, report: Report) => {
    if (!report.resolvedImage) return;
    e.stopPropagation();

    setSwappedReports((prev) => {
      const next = new Set(prev);
      if (next.has(report.id)) {
        next.delete(report.id);
      } else {
        next.add(report.id);
      }
      return next;
    });
  };

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
    let currentFilteredReports = reports;

    const selectedId =
      selectedInlet?.id ||
      selectedOutlet?.id ||
      selectedPipe?.id ||
      selectedDrain?.id;

    if (selectedId) {
      currentFilteredReports = currentFilteredReports.filter(
        (report) => report.componentId === selectedId
      );
    }

    const now = new Date();
    let cutoffDate: Date | null = null; // Initialize cutoffDate

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
      case 'all':
      default:
        // No date cutoff for 'all', but we still want to sort
        break;
    }

    // Apply cutoffDate filtering if it exists
    if (cutoffDate) {
      currentFilteredReports = currentFilteredReports.filter(
        (report) => new Date(report.date).getTime() >= cutoffDate!.getTime()
      );
    }

    // Always sort the reports by date in descending order (latest to oldest)
    currentFilteredReports.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return currentFilteredReports;
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

  const componentName = getComponentDisplayName(
    selectedInlet,
    selectedOutlet,
    selectedPipe,
    selectedDrain
  );

  return (
    <div className="flex h-full w-full flex-col pt-3 pr-3 pb-5 pl-5">
      <CardHeader className="mb-6 flex items-center justify-between px-1 py-0">
        <div className="flex flex-col gap-1.5">
          <CardTitle>{componentName}</CardTitle>
          <CardDescription className="text-xs">
            {`View reports related to ${componentName.toLowerCase()}`}
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
      <div className="boverflow-y-auto flex-1 pb-5">
        {!selectedInlet &&
        !selectedOutlet &&
        !selectedPipe &&
        !selectedDrain ? (
          <div className="flex h-full items-center justify-center">
            <div className="mb-15 flex flex-col items-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#DCDCDC] bg-[#EBEBEB]">
                <MapPin className="h-6 w-6 self-center text-[#8D8D8D]" />
              </div>
              <p className="text-sm font-medium text-gray-900">
                No Asset Selected
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                Select an asset on the map
              </p>
            </div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#DCDCDC] bg-[#EBEBEB]">
                <History className="h-6 w-6 self-center text-[#8D8D8D]" />
              </div>
              <p className="text-sm font-medium text-gray-900">
                No Reports Found
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {isSimulationMode
                  ? 'Reports are not visible in simulation mode'
                  : 'No reports found for the selected time period'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report) => {
              const isSwapped = swappedReports.has(report.id);
              const hasResolvedImage = !!report.resolvedImage;
              const displayImage =
                isSwapped && report.resolvedImage
                  ? report.resolvedImage
                  : report.image;

              return (
                <div
                  key={report.id}
                  className="hover:bg-accent flex cursor-pointer flex-row gap-3 rounded-lg border p-3 transition-colors"
                  onClick={() => handleReportClick(report)}
                >
                  <div className="flex items-start gap-3">
                    {/* Image Thumbnail with Badges */}
                    <div className="relative shrink-0">
                      {displayImage ? (
                        <div
                          className="group relative"
                          onClick={(e) =>
                            hasResolvedImage && handleToggleImage(e, report)
                          }
                        >
                          <Image
                            src={displayImage}
                            alt={report.category}
                            width={80}
                            height={80}
                            className={`h-25 w-21 rounded object-cover transition-all duration-300 ${isSwapped ? 'ring-2 ring-green-500' : ''}`}
                            unoptimized
                          />

                          {hasResolvedImage && (
                            <div
                              className={`absolute -right-2 -bottom-2 rounded-full border p-1 shadow-sm transition-colors ${isSwapped ? 'border-green-200 bg-green-100 text-green-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}
                            >
                              {isSwapped ? (
                                <History className="h-3 w-3" />
                              ) : (
                                <ArrowRight className="h-3 w-3" />
                              )}
                            </div>
                          )}

                          {hasResolvedImage && !isSwapped && (
                            <div className="absolute inset-0 flex items-center justify-center rounded bg-black/0 text-[10px] font-medium text-white opacity-0 transition-colors group-hover:bg-black/10 group-hover:opacity-100">
                              See Status
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded bg-gray-100 text-xs text-gray-400">
                          No image
                        </div>
                      )}
                    </div>

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
              );
            })}
          </div>
        )}
      </div>

      {showImageViewer && selectedReport && selectedReport.image && (
        <ImageViewer
          imageUrl={selectedReport.image}
          reporterName={selectedReport.reporterName}
          date={selectedReport.date}
          category={selectedReport.category}
          description={selectedReport.description}
          coordinates={selectedReport.coordinates}
          componentId={selectedReport.componentId}
          address={selectedReport.address}
          onClose={() => setShowImageViewer(false)}
        />
      )}
    </div>
  );
}
