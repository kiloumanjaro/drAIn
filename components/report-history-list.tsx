"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import type { Report as SupabaseReport } from "@/lib/supabase/report"; // Renamed to avoid conflict
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SpinnerEmpty } from "@/components/spinner-empty";
import { format, subWeeks, subMonths, startOfDay } from "date-fns";
import type { DateFilterValue } from "./date-sort";
import { RefreshCw, MapPin, History, ArrowLeftRight, ArrowRight } from "lucide-react";
import type {
  Inlet,
  Outlet,
  Pipe,
  Drain,
} from "@/components/control-panel/types";
import { ImageViewer } from "@/components/image-viewer"; // Import ImageViewer

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
  return "Report History";
};

export default function ReportHistoryList({
  dateFilter = "all",
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
      case "resolved":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "unresolved":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
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
      currentFilteredReports = currentFilteredReports.filter((report) => report.componentId === selectedId);
    }

    const now = new Date();
    let cutoffDate: Date | null = null; // Initialize cutoffDate

    switch (dateFilter) {
      case "today":
        cutoffDate = startOfDay(now);
        break;
      case "week":
        cutoffDate = subWeeks(now, 1);
        break;
      case "2weeks":
        cutoffDate = subWeeks(now, 2);
        break;
      case "3weeks":
        cutoffDate = subWeeks(now, 3);
        break;
      case "month":
        cutoffDate = subMonths(now, 1);
        break;
      case "all":
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
      <div className="w-full h-full flex items-center justify-center">
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
    <div className="w-full h-full flex flex-col pb-5 pl-5 pr-3 pt-3">
      <CardHeader className="py-0 flex px-1 items-center justify-between mb-6">
        <div className="flex flex-col gap-1.5">
          <CardTitle>{componentName}</CardTitle>
          <CardDescription className="text-xs">
            {`View reports related to ${componentName.toLowerCase()}`}
          </CardDescription>
        </div>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="w-8 h-8 bg-[#EBEBEB] border border-[#DCDCDC] rounded-full flex items-center justify-center transition-colors hover:bg-[#E0E0E0] disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh reports"
        >
          <RefreshCw
            className={`w-4 h-4 text-[#8D8D8D] cursor-pointer ${
              isRefreshing ? "animate-spin" : ""
            }`}
          />
        </button>
      </CardHeader>
      <div className="flex-1 pb-5 boverflow-y-auto">
        {!selectedInlet &&
        !selectedOutlet &&
        !selectedPipe &&
        !selectedDrain ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center items-center mb-15 flex flex-col">
              <div className="w-12 h-12 flex justify-center items-center bg-[#EBEBEB] border border-[#DCDCDC] rounded-full mb-3">
                <MapPin className="self-center w-6 h-6 text-[#8D8D8D]" />
              </div>
              <p className="text-sm font-medium text-gray-900">
                No Asset Selected
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Select an asset on the map
              </p>
            </div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center items-center flex flex-col">
              <div className="w-12 h-12 flex justify-center items-center bg-[#EBEBEB] border border-[#DCDCDC] rounded-full mb-3">
                <History className="self-center w-6 h-6 text-[#8D8D8D]" />
              </div>
              <p className="text-sm font-medium text-gray-900">
                No Reports Found
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isSimulationMode
                  ? "Reports are not visible in simulation mode"
                  : "No reports found for the selected time period"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report) => {
              const isSwapped = swappedReports.has(report.id);
              const hasResolvedImage = !!report.resolvedImage;
              const displayImage = isSwapped && report.resolvedImage ? report.resolvedImage : report.image;

              return (
              <div
                key={report.id}
                className="flex flex-row gap-3 border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer"
                onClick={() => handleReportClick(report)}
              >
                <div className="flex items-start gap-3">
                  {/* Image Thumbnail with Badges */}
                  <div className="relative shrink-0">
                  {displayImage ? (
                     <div 
                        className="relative group"
                        onClick={(e) => hasResolvedImage && handleToggleImage(e, report)}
                     >
                        <Image
                          src={displayImage}
                          alt={report.category}
                          width={80}
                          height={80}
                          className={`w-21 h-25 object-cover rounded transition-all duration-300 ${isSwapped ? "ring-2 ring-green-500" : ""}`}
                          unoptimized
                        />
                        
                        {hasResolvedImage && (
                          <div className={`absolute -bottom-2 -right-2 p-1 rounded-full shadow-sm border transition-colors ${isSwapped ? "bg-green-100 border-green-200 text-green-700" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                             {isSwapped ? (
                                <History className="w-3 h-3" />
                             ) : (
                                <ArrowRight className="w-3 h-3" />
                             )}
                          </div>
                        )}
                         
                        {hasResolvedImage && !isSwapped && (
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded flex items-center justify-center opacity-0 group-hover:opacity-100 font-medium text-[10px] text-white">
                                See Status
                            </div>
                        )}
                    </div>
                  ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">
                      No image
                    </div>
                  )}
                  </div>

                  {/* Report Details */}
                  <div className="flex-1 flex flex-col gap-3 min-w-0">
                    <div className="flex-1">
                      {/* Description */}
                      <p className="text-sm text-foreground line-clamp-2 mb-2">
                        {report.description}
                      </p>

                      {/* Metadata */}
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">
                            {report.reporterName || "Anonymous"}
                          </span>
                          <span>on</span>
                          <span>{report.componentId}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>
                            {format(new Date(report.date), "MMM dd, yyyy")}
                          </span>
                          {/*Apply Geocoding Here */}
                          <span>{report.address}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] font-normal px-3 py-0 h-5 justify-center"
                      >
                        {report.category}
                      </Badge>
                      <div
                        className={`text-[10px] px-3 py-0.5 h-5 rounded-md border flex items-center justify-center ${getStatusStyle(
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
