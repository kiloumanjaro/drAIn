'use client';

import { useEffect, useState } from 'react';
import ZoneMap from './ZoneMap';
import ComponentTypeChart from './ComponentTypeChart';
import RepairTimeCards from './RepairTimeCards';
import {
  getIssuesPerZone,
  getComponentTypeData,
  getRepairTimeByComponent,
} from '@/lib/dashboard/queries';
import type {
  ZoneIssueData,
  ComponentTypeData,
  RepairTimeByComponentData,
} from '@/lib/dashboard/queries';

export default function AnalyticsTab() {
  const [zoneData, setZoneData] = useState<ZoneIssueData[]>([]);
  const [componentData, setComponentData] = useState<ComponentTypeData[]>([]);
  const [repairTimeData, setRepairTimeData] = useState<
    RepairTimeByComponentData[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [zones, components, times] = await Promise.all([
          getIssuesPerZone(),
          getComponentTypeData(),
          getRepairTimeByComponent(),
        ]);
        setZoneData(zones);
        setComponentData(components);
        setRepairTimeData(times);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (error) {
    return (
      <div className="py-8 text-center text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Zone Map */}
      <ZoneMap data={zoneData} loading={loading} />

      {/* Component Type Chart (left - 2/3) and Repair Time Cards (right - 1/3) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <section className="md:col-span-2">
          <ComponentTypeChart data={componentData} loading={loading} />
        </section>

        <aside className="md:col-span-1">
          <h3 className="mb-4 text-lg font-semibold">
            Average Repair Time by Component
          </h3>
          <RepairTimeCards data={repairTimeData} loading={loading} />
        </aside>
      </div>
    </div>
  );
}
