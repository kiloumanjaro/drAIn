'use client';

import { useEffect, useState } from 'react';
import StatsCards from './StatsCards';
import RepairTrendChart from './RepairTrendChart';
import ZoneMap from './ZoneMap';
import ComponentTypeChart from './ComponentTypeChart';
import RepairTimeCards from './RepairTimeCards';
import {
  getOverviewMetrics,
  getRepairTrendData,
  getIssuesPerZone,
  getComponentTypeData,
  getRepairTimeByComponent,
} from '@/lib/dashboard/queries';
import type {
  OverviewMetrics,
  RepairTrendData,
  ZoneIssueData,
  ComponentTypeData,
  RepairTimeByComponentData,
} from '@/lib/dashboard/queries';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function AnalyticsTab() {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [trendData, setTrendData] = useState<RepairTrendData[]>([]);
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
        const [metricsData, trendDataResult, zones, components, times] =
          await Promise.all([
            getOverviewMetrics(),
            getRepairTrendData(),
            getIssuesPerZone(),
            getComponentTypeData(),
            getRepairTimeByComponent(),
          ]);
        setMetrics(metricsData);
        setTrendData(trendDataResult);
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
      {/* Header Section */}
      <div>
        <h2 className="mb-1 text-xl font-semibold text-gray-900">
          System Analytics & Overview
        </h2>
        <p className="text-muted-foreground text-sm">
          Real-time monitoring and analysis of the drainage system
          infrastructure.
        </p>
      </div>

      {/* Stats Cards */}
      <StatsCards
        fixedThisMonth={metrics?.fixedThisMonth ?? 0}
        pendingIssues={metrics?.pendingIssues ?? 0}
        averageRepairDays={metrics?.averageRepairDays ?? 0}
        loading={loading}
      />

      {/* Zone Map */}
      <ZoneMap data={zoneData} loading={loading} />

      {/* Repair Trend Chart */}
      <RepairTrendChart data={trendData} loading={loading} />

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
