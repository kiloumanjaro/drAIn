"use client";

import { useEffect, useState, useMemo } from "react";
import ReportCard from "./ReportCard";
import ReportFilters from "./ReportFilters";
import { getAllReports } from "@/lib/dashboard/queries";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReportWithMetadata } from "@/lib/dashboard/queries";

export default function ReportsTab() {
  const [reports, setReports] = useState<ReportWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [priority, setPriority] = useState("all");
  const [status, setStatus] = useState("all");
  const [componentType, setComponentType] = useState("all");

  // Fetch reports
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const allReports = await getAllReports();
        setReports(allReports);
      } catch (err) {
        console.error("Error fetching reports:", err);
        setError("Failed to load reports. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  // Filter and sort reports
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (priority !== "all" && report.priority !== priority) return false;
      if (status !== "all" && report.status !== status) return false;

      if (componentType !== "all" && report.componentId) {
        const lower = report.componentId.toLowerCase();
        if (componentType === "inlets" && !lower.includes("inlet")) return false;
        if (componentType === "outlets" && !lower.includes("outlet")) return false;
        if (componentType === "storm_drains" && !lower.includes("drain")) return false;
        if (componentType === "man_pipes" && !lower.includes("pipe")) return false;
      }

      return true;
    });
  }, [reports, priority, status, componentType]);

  // Sort by date (newest first)
  const sortedReports = useMemo(() => {
    return [...filteredReports].sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [filteredReports]);

  const handleClear = () => {
    setPriority("all");
    setStatus("all");
    setComponentType("all");
  };

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>{error}</p>
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
      />

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          Showing{" "}
          <span className="font-bold text-gray-900">{sortedReports.length}</span>{" "}
          of{" "}
          <span className="font-bold text-gray-900">{reports.length}</span>{" "}
          reports
        </p>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-[#ced1cd] overflow-hidden"
            >
              <Skeleton className="w-full h-40 mb-4" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : sortedReports.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No reports found</p>
          <p className="text-gray-400 text-sm mt-2">
            Try adjusting your filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedReports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}

      {/* Footer Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <h4 className="font-semibold text-blue-900 mb-2">About Reports</h4>
        <p className="text-sm text-blue-800">
          All drainage issues reported by the community are tracked here. Priority levels
          are assigned based on the severity and number of reports for the same location.
          Reports progress from pending → in-progress → resolved as maintenance teams
          address them.
        </p>
      </div>
    </div>
  );
}
