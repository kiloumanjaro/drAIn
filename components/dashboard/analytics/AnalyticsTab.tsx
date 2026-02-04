'use client';

import ZoneMap from './ZoneMap';
import ComponentTypeChart from './ComponentTypeChart';
import RepairTimeCards from './RepairTimeCards';
import { useAnalytics } from '@/lib/query/hooks/useAnalytics';

export default function AnalyticsTab() {
  const { zoneData, componentData, repairTimeData, isLoading, error } =
    useAnalytics();

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
      <ZoneMap data={zoneData} loading={isLoading} />

      {/* Component Type Chart (left - 2/3) and Repair Time Cards (right - 1/3) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <section className="md:col-span-2">
          <ComponentTypeChart data={componentData} loading={isLoading} />
        </section>

        <aside className="md:col-span-1">
          <h3 className="mb-4 text-lg font-semibold">
            Average Repair Time by Component
          </h3>
          <RepairTimeCards data={repairTimeData} loading={isLoading} />
        </aside>
      </div>
    </div>
  );
}
