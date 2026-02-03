'use client';

import React, { useState, useEffect } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs-custom';
import { BarChart3, FileText, Clock, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Import tab components (will create these)
import AnalyticsTab from '@/components/dashboard/analytics/AnalyticsTab';
import ReportsTab from '@/components/dashboard/reports/ReportsTab';
import StatsCards from '@/components/dashboard/analytics/StatsCards';
import { getOverviewMetrics } from '@/lib/dashboard/queries';
import type { OverviewMetrics } from '@/lib/dashboard/queries';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('analytics');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const refreshTimerRef = React.useRef<number | null>(null);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const data = await getOverviewMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Error refreshing metrics:', err);
    } finally {
      setLastUpdated(new Date());
      refreshTimerRef.current = window.setTimeout(() => {
        setIsRefreshing(false);
        refreshTimerRef.current = null;
      }, 800);
    }
  };

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await getOverviewMetrics();
        setMetrics(data);
      } catch (err) {
        console.error('Error fetching metrics:', err);
      } finally {
        setMetricsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  React.useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  // Manage scrollbar visibility
  React.useEffect(() => {
    document.body.style.overflowY = 'scroll';
    return () => {
      document.body.style.overflowY = '';
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#e8e8e8]/50 px-5">
      <div className="mx-auto py-5">
        {/* Header */}
        <div className="rounded-t-xl border border-[#dfdfdf] bg-[#fcfcfc] px-6 py-2">
          <div className="flex items-center justify-between gap-4">
            <p className="text-foreground/70 font-semibold">Public Dashboard</p>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full bg-gray-50 px-3 py-1 text-sm text-gray-600 sm:flex">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>
                  Updated{' '}
                  {formatDistanceToNow(lastUpdated, { addSuffix: true })}
                </span>
              </div>

              <button
                onClick={handleRefresh}
                title={isRefreshing ? 'Refreshing...' : 'Refresh data'}
                aria-busy={isRefreshing}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                />
                <span>{isRefreshing ? 'Refreshing' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="border-x border-[#dfdfdf] bg-[#fcfcfc] pt-6">
          {/* Header Section */}
          <div className="space-y-6 px-8">
            <h2 className="mb-1 text-xl font-semibold text-gray-900">
              System Analytics & Overview
            </h2>
            <p className="text-muted-foreground text-sm">
              Real-time monitoring and analysis of the drainage system
              infrastructure.
            </p>
            {/* Stats Cards */}
            <StatsCards
              fixedThisMonth={metrics?.fixedThisMonth ?? 0}
              pendingIssues={metrics?.pendingIssues ?? 0}
              averageRepairDays={metrics?.averageRepairDays ?? 0}
              loading={metricsLoading}
            />
          </div>

          {/* Tabs */}
          <div className="mt-5 overflow-hidden">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList>
                <TabsTrigger
                  value="analytics"
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Analytics</span>
                </TabsTrigger>
                <TabsTrigger
                  value="reports"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>All Reports</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab Content */}
              <div className="border-y border-[#dfdfdf] bg-[#fcfcfc] px-10 py-5">
                <TabsContent value="analytics" className="m-0">
                  <AnalyticsTab />
                </TabsContent>
                <TabsContent value="reports" className="m-0">
                  <ReportsTab />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
