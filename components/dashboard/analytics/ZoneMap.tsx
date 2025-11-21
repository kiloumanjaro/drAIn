"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { getZoneColorByCount } from "@/lib/dashboard/geojson";
import type { ZoneIssueData } from "@/lib/dashboard/queries";
import { MapPin } from "lucide-react";

interface ZoneMapProps {
  data: ZoneIssueData[];
  loading?: boolean;
}

export default function ZoneMap({ data, loading = false }: ZoneMapProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-[#ced1cd] p-6">
        <h3 className="text-lg font-semibold mb-4">Issues Per Zone (Barangay Breakdown)</h3>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-[#ced1cd] p-6">
        <h3 className="text-lg font-semibold mb-4">Issues Per Zone (Barangay Breakdown)</h3>
        <div className="flex items-center justify-center h-96 text-gray-500">
          <p>No zone data available</p>
        </div>
      </div>
    );
  }

  // Sort by count descending
  const sortedData = [...data].sort((a, b) => b.count - a.count);

  // Create a grid display of zones with issue counts
  return (
    <div className="bg-white rounded-lg border border-[#ced1cd] p-6">
      <h3 className="text-lg font-semibold mb-4">Issues Per Zone (Barangay Breakdown)</h3>

      {/* Map placeholder - In production, integrate Mapbox */}
      <div className="bg-gray-100 rounded-lg h-96 mb-6 flex items-center justify-center border border-gray-300">
        <div className="text-center">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">
            Interactive map visualization coming soon
          </p>
          <p className="text-sm text-gray-500 mt-1">
            See zone breakdown below for current data
          </p>
        </div>
      </div>

      {/* Zone breakdown cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {sortedData.map((zone) => {
          const { bgColor, color } = getZoneColorByCount(zone.count);
          return (
            <div
              key={zone.zone}
              className={`rounded-lg p-3 text-center border transition-shadow hover:shadow-md ${bgColor}`}
            >
              <p className="text-xs font-semibold text-gray-700 mb-1 truncate">
                {zone.zone}
              </p>
              <p className={`text-lg font-bold ${color}`}>{zone.count}</p>
              <p className="text-xs text-gray-600 mt-1">
                {zone.count === 1 ? "issue" : "issues"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Details section */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-3">Zone Details</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {sortedData.map((zone) => (
            <div
              key={zone.zone}
              className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
            >
              <span className="font-medium text-gray-800">{zone.zone}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {((zone.count / data.reduce((sum, z) => sum + z.count, 0)) * 100).toFixed(1)}%
                </span>
                <span className="font-bold text-gray-900 w-8 text-right">
                  {zone.count}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>Issues distributed across barangays in Mandaue City. Click on zones in the map to view details.</p>
      </div>
    </div>
  );
}
