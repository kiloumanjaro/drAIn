'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import RepairTimeCards from './repair-time-cards';
import { useAnalytics } from '@/lib/query/hooks/use-analytics';

// Mapbox GL (the zone map) and recharts (the pie chart) are most of the
// dashboard's script. Loaded after the page so the figures above show first;
// the placeholders take the space of each component's own loading state.
const ZoneMap = dynamic(() => import('./zone-map'), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-6">
      <div className="md:col-span-4">
        <Skeleton className="h-[28rem] w-full rounded-lg md:h-[36rem]" />
      </div>
      <Skeleton className="h-[28rem] rounded-lg md:col-span-2 md:h-[36rem]" />
    </div>
  ),
});
const ComponentTypeChart = dynamic(() => import('./component-type-chart'), {
  ssr: false,
  loading: () => <Skeleton className="h-[348px] w-full rounded-lg" />,
});

interface AnalyticsTabProps {
  onViewReports?: () => void;
}

export default function AnalyticsTab({ onViewReports }: AnalyticsTabProps) {
  const {
    zoneData,
    componentData,
    repairTimeData,
    reportLocations,
    isLoading,
    error,
  } = useAnalytics();

  if (error) {
    return (
      <div className="py-8 text-center text-red-600">
        <p>Failed to load analytics data. Please refresh the page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Zone Map */}
      <ZoneMap data={zoneData} reports={reportLocations} loading={isLoading} />

      {/* Component Type Chart (left - 2/3) and Repair Time Cards (right - 1/3) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <section className="md:col-span-2">
          <ComponentTypeChart
            data={componentData}
            loading={isLoading}
            onViewReports={onViewReports}
          />
        </section>

        <aside className="md:col-span-1">
          <RepairTimeCards data={repairTimeData} loading={isLoading} />
        </aside>
      </div>
    </div>
  );
}
