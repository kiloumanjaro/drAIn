'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Map, FileText, Clock, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Import tab components (will create these)
import OverviewTab from '@/components/dashboard/overview/OverviewTab';
import AnalyticsTab from '@/components/dashboard/analytics/AnalyticsTab';
import ReportsTab from '@/components/dashboard/reports/ReportsTab';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimerRef = React.useRef<number | null>(null);

  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    // update timestamp (replace with real fetch if available)
    setLastUpdated(new Date());
    // simulate a short refresh animation / async op
    refreshTimerRef.current = window.setTimeout(() => {
      setIsRefreshing(false);
      refreshTimerRef.current = null;
    }, 800);
  };

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
    <div className="min-h-screen bg-[#e8e8e8]/50">
      <div className="mx-auto w-[1280px] px-4 py-8 md:px-6">
        {/* Header */}
        <div className="mb-6 rounded-xl border border-[#ced1cd] bg-white px-6 py-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center rounded-lg bg-blue-50 p-2 text-blue-600 shadow-inner">
                <BarChart3 className="h-6 w-6" />
              </div>

              <div>
                <h1 className="text-foreground text-2xl leading-tight font-semibold md:text-3xl">
                  drAIn Public Dashboard
                </h1>
                <p className="text-foreground/70 mt-1 max-w-lg text-sm">
                  Real-time transparency and analytics for the drainage system —
                  publicly available to build community trust.
                </p>
              </div>
            </div>

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

              <button
                onClick={() => setActiveTab('reports')}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
              >
                Explore
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="overflow-hidden rounded-xl border border-[#ced1cd] bg-white">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 rounded-t-xl border-b border-blue-200 bg-blue-50">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="flex items-center gap-2"
              >
                <Map className="h-4 w-4" />
                <span>Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>All Reports</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab Content */}
            <div className="p-6">
              <TabsContent value="overview" className="m-0">
                <OverviewTab />
              </TabsContent>
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
  );
}
