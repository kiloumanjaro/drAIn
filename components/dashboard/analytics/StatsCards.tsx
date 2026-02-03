'use client';

import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Info } from 'lucide-react';
import { formatDays } from '@/lib/dashboard/calculations';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface StatsCardsProps {
  fixedThisMonth: number;
  pendingIssues: number;
  averageRepairDays: number;
  loading?: boolean;
  // Mock trend data for now - in real implementation, these would come from queries
  fixedTrend?: number[];
  pendingTrend?: number[];
  repairTimeTrend?: number[];
}

// Simple trend line component
function TrendLine({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 60;
      // Add padding and adjust scaling to prevent cropping
      const y = 5 + ((max - value) / range) * 20; // 5px top padding, 20px usable height
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width="60" height="30" className="opacity-70">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
    </svg>
  );
}

export default function StatsCards({
  fixedThisMonth,
  pendingIssues,
  averageRepairDays,
  loading = false,
  fixedTrend = [12, 8, 15, 18, fixedThisMonth], // Mock data
  pendingTrend = [45, 52, 38, 41, pendingIssues], // Mock data
  repairTimeTrend = [7.2, 6.8, 7.5, 6.9, averageRepairDays], // Mock data
}: StatsCardsProps) {
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-[#e2e2e2] bg-[#f7f7f7]"
          >
            <div className="rounded-t-xl border-b border-[#e2e2e2] px-4 py-2">
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="space-y-3 px-6 py-4">
              <Skeleton className="mb-2 h-8 w-16" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="ml-auto h-6 w-14" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    {
      id: 'fixed',
      label: 'Fixed This Month',
      value: fixedThisMonth,
      color: 'text-green-600',
      tooltipText: 'Reports resolved',
      trendData: fixedTrend,
      trendColor: '#16a34a',
    },
    {
      id: 'pending',
      label: 'Pending Issues',
      value: pendingIssues,
      color: 'text-orange-600',
      tooltipText: 'Awaiting action',
      trendData: pendingTrend,
      trendColor: '#ea580c',
    },
    {
      id: 'repair',
      label: 'Average Repair Time',
      value: formatDays(averageRepairDays),
      color: 'text-blue-600',
      tooltipText: 'From report to completion',
      trendData: repairTimeTrend,
      trendColor: '#2563eb',
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.id}
          className="rounded-xl border border-[#e2e2e2] bg-[#f7f7f7]"
        >
          <div className="flex cursor-pointer flex-row items-center justify-between rounded-t-xl px-4 py-2 transition-colors">
            <span className="text-xs">{stat.label}</span>
            <Info className="h-3.5 w-3.5 opacity-70" />
          </div>

          <Card className="gap-3 space-y-3 border-x-0 border-b-0 border-[#e2e2e2] pb-6">
            <div className="flex items-start justify-between px-8">
              <div className="flex-1">
                <p className={`text-3xl font-bold ${stat.color}`}>
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-gray-500">{stat.tooltipText}</p>
              </div>
              <div className="ml-4 flex items-end">
                <TrendLine data={stat.trendData} color={stat.trendColor} />
              </div>
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
}
