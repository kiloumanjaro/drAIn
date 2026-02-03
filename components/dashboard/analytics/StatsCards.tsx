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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

// Simple trend line component with color based on direction
function TrendLine({ data }: { data: number[] }) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  // Determine trend direction (is the last value higher or lower than the first?)
  const isIncreasing = data[data.length - 1] >= data[0];
  const color = isIncreasing ? '#16a34a' : '#dc2626'; // Green if increasing, red if decreasing

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

// Calculate percentage change between first and last values
function calculatePercentageChange(data: number[]): number {
  if (!data || data.length < 2) return 0;
  const firstValue = data[0];
  if (firstValue === 0) return 0;
  return ((data[data.length - 1] - firstValue) / firstValue) * 100;
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
            <div className="flex items-start justify-between px-8 py-6">
              <div className="flex-1">
                <Skeleton className="h-8 w-16" />
              </div>
              <div className="ml-4">
                <Skeleton className="h-7 w-14" />
              </div>
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
      tooltipText: 'The number of reports resolved for the month',
      trendData: fixedTrend,
    },
    {
      id: 'pending',
      label: 'Pending Issues',
      value: pendingIssues,
      tooltipText: 'Reports that are awaiting action from an admin',
      trendData: pendingTrend,
    },
    {
      id: 'repair',
      label: 'Average Repair Time',
      value: formatDays(averageRepairDays),
      tooltipText: 'From report to completion',
      trendData: repairTimeTrend,
    },
  ];

  return (
    <TooltipProvider>
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const percentageChange = calculatePercentageChange(stat.trendData);
          const isPositive = percentageChange >= 0;

          return (
            <div
              key={stat.id}
              className="rounded-xl border border-[#e2e2e2] bg-[#f7f7f7]"
            >
              <div className="flex cursor-pointer flex-row items-center justify-between rounded-t-xl px-4 py-2 transition-colors">
                <span className="text-xs">{stat.label}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 cursor-help opacity-70" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{stat.tooltipText}</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <Card className="gap-3 space-y-3 border-x-0 border-b-0 border-[#e2e2e2] pb-6">
                <div className="flex items-start justify-between px-8">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className="text-3xl font-bold text-gray-900">
                        {stat.value}
                      </p>
                      <span
                        className={`text-sm font-semibold ${
                          isPositive ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {percentageChange.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex items-end">
                    <TrendLine data={stat.trendData} />
                  </div>
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
