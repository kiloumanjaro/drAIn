'use client';

import React, { useState } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs-custom';
import { BarChart3, FileText, Clock, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Import tab components
import AnalyticsTab from '@/components/dashboard/analytics/AnalyticsTab';
import ReportsTab from '@/components/dashboard/reports/ReportsTab';
import StatsCards from '@/components/dashboard/analytics/StatsCards';
import { useOverviewMetrics } from '@/lib/query/hooks/useOverviewMetrics';

export default function DashboardPage() {
  const {
    data: metrics,
    isLoading: metricsLoading,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useOverviewMetrics();
  const [activeTab, setActiveTab] = useState('analytics');

  // Manage scrollbar visibility
  React.useEffect(() => {
    document.body.style.overflowY = 'scroll';
    return () => {
      document.body.style.overflowY = '';
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#e8e8e8]/50 px-8">
      <div className="mx-auto py-5 pb-5">
        {/* Header */}
        <div className="rounded-t-xl border border-[#dfdfdf] bg-white px-6 py-2">
          <div className="flex items-center justify-between gap-4">
            <p className="text-foreground/70 font-semibold">Public Dashboard</p>

            <div className="flex items-center gap-5">
              <div className="hidden items-center gap-2 rounded-full text-xs text-gray-600 sm:flex">
                <Clock className="h-3.5 w-3.5 text-gray-500" />
                <span>
                  Updated{' '}
                  {formatDistanceToNow(dataUpdatedAt, { addSuffix: true })}
                </span>
              </div>

              <button
                onClick={() => refetch()}
                title={isFetching ? 'Refreshing...' : 'Refresh data'}
                aria-busy={isFetching}
                disabled={isFetching}
                className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
                />
                <span>{isFetching ? 'Refreshing' : 'Refresh'}</span>
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
              totalAdmins={metrics?.totalAdmins ?? 0}
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
              <div className="mb-5 border-t border-[#dfdfdf] bg-[#fcfcfc] px-10 py-5">
                <TabsContent value="analytics" className="m-0" forceMount>
                  <div className={activeTab !== 'analytics' ? 'hidden' : ''}>
                    <AnalyticsTab
                      onViewReports={() => setActiveTab('reports')}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="reports" className="m-0" forceMount>
                  <div className={activeTab !== 'reports' ? 'hidden' : ''}>
                    <ReportsTab />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        {/* Footer */}
        <div className="rounded-b-xl border border-[#dfdfdf] bg-gradient-to-b from-[#ffffff] to-[#f3f3f3] px-6 py-3.5 text-center text-sm text-gray-600">
          © 2024 drAIn Project. All rights reserved.
        </div>
      </div>
    </div>
  );
}
