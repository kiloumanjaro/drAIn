'use client';

import { useEffect, useState } from 'react';
import StatsCards from './StatsCards';
import RepairTrendChart from './RepairTrendChart';
import {
  getOverviewMetrics,
  getRepairTrendData,
} from '@/lib/dashboard/queries';
import type { OverviewMetrics, RepairTrendData } from '@/lib/dashboard/queries';

export default function OverviewTab() {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [trendData, setTrendData] = useState<RepairTrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [metricsData, trendDataResult] = await Promise.all([
          getOverviewMetrics(),
          getRepairTrendData(),
        ]);
        setMetrics(metricsData);
        setTrendData(trendDataResult);
      } catch (err) {
        console.error('Error fetching overview data:', err);
        setError('Failed to load overview data. Please refresh the page.');
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
      {/* Stats Cards */}
      <StatsCards
        fixedThisMonth={metrics?.fixedThisMonth ?? 0}
        pendingIssues={metrics?.pendingIssues ?? 0}
        averageRepairDays={metrics?.averageRepairDays ?? 0}
        loading={loading}
      />

      {/* Trend Chart */}
      <RepairTrendChart data={trendData} loading={loading} />

      {/* Description */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          These metrics show the real-time status of the drainage system. Issues
          are tracked from when they are reported by citizens until they are
          resolved by maintenance teams. Average repair time is calculated from
          the date a report is submitted to when maintenance work is completed.
        </p>
      </div>
    </div>
  );
}
