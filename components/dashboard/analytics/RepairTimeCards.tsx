import { Skeleton } from "@/components/ui/skeleton";
import { formatDays, formatComponentType } from "@/lib/dashboard/calculations";
import type { RepairTimeByComponentData } from "@/lib/dashboard/queries";
import { Clock } from "lucide-react";

interface RepairTimeCardsProps {
  data: RepairTimeByComponentData[];
  loading?: boolean;
}

export default function RepairTimeCards({
  data,
  loading = false,
}: RepairTimeCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-[#ced1cd] p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No repair time data available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {data.map((item) => (
        <div
          key={item.type}
          className="bg-white rounded-lg border border-[#ced1cd] p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">
              {formatComponentType(item.type)}
            </p>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {formatDays(item.averageDays)}
          </p>
          <p className="text-xs text-gray-500 mt-2">Average repair time</p>
        </div>
      ))}
    </div>
  );
}
