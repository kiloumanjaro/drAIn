import { Skeleton } from '@/components/ui/skeleton';
import { formatDays, formatComponentType } from '@/lib/dashboard/calculations';
import type { RepairTimeByComponentData } from '@/lib/dashboard/queries';

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
      <div className="grid grid-cols-1 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-[#ced1cd] bg-white p-4"
          >
            <Skeleton className="mb-2 h-4 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        <p>No repair time data available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {data.map((item) => (
        <div
          key={item.type}
          className="rounded-lg border border-[#ced1cd] bg-white p-4 transition-shadow hover:border-blue-400"
        >
          <div className="mb-2 flex items-start justify-between">
            <p className="text-sm font-medium text-gray-600">
              {formatComponentType(item.type)}
            </p>
          </div>
          <p className="text-2xl text-blue-500">
            {formatDays(item.averageDays)}
          </p>
        </div>
      ))}
    </div>
  );
}
