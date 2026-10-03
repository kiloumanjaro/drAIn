'use client';

import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Info, Plus } from 'lucide-react';
import { formatDays } from '@/lib/dashboard/calculations';
import { Card } from '@/components/ui/card';
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
  totalAdmins: number;
  /** Of fixedThisMonth, those someone other than the crew confirmed. */
  verifiedFixedThisMonth?: number;
  /** Finished work nobody has checked yet. */
  awaitingVerification?: number;
  loading?: boolean;
  // Past values, oldest first. A trend line and change are shown only when
  // these are passed. They used to default to made-up numbers, so every
  // card showed a trend and a percentage change that meant nothing.
  fixedTrend?: number[];
  pendingTrend?: number[];
  repairTimeTrend?: number[];
  adminTrend?: number[];
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

interface StatCard {
  id: string;
  label: string;
  value: string | number;
  tooltipText: string;
  trendData?: number[];
  note?: string;
}

/** e.g. "3 checked · 2 jobs awaiting a check". */
function verificationNote(
  verified: number | undefined,
  awaiting: number | undefined
): string | undefined {
  if (verified === undefined) return undefined;
  const waiting = awaiting
    ? ` · ${awaiting} job${awaiting === 1 ? '' : 's'} awaiting a check`
    : '';
  return `${verified} checked${waiting}`;
}

export default function StatsCards({
  fixedThisMonth,
  pendingIssues,
  averageRepairDays,
  totalAdmins,
  verifiedFixedThisMonth,
  awaitingVerification,
  loading = false,
  fixedTrend,
  pendingTrend,
  repairTimeTrend,
  adminTrend,
}: StatsCardsProps) {
  const router = useRouter();

  const handleAddAdmin = () => {
    router.push('/map?activetab=profile');
  };

  if (loading) {
    return (
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-[#dfdfdf] bg-[#f7f7f7]"
          >
            <div className="rounded-t-xl border-b border-[#dfdfdf] px-4 py-2">
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
      tooltipText:
        'Reports resolved this month. "Checked" counts fixes confirmed by someone other than the crew that did the work: a colleague, or the person who reported it.',
      trendData: fixedTrend,
      note: verificationNote(verifiedFixedThisMonth, awaitingVerification),
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
    {
      id: 'admins',
      label: 'Agency Staff',
      value: totalAdmins,
      tooltipText: 'People who have joined an agency with its join code',
      trendData: adminTrend,
    },
  ] as StatCard[];

  return (
    <TooltipProvider>
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        {stats.map((stat) => {
          const isAdminCard = stat.id === 'admins';
          const hasTrend = !!stat.trendData && stat.trendData.length >= 2;
          const percentageChange = hasTrend
            ? calculatePercentageChange(stat.trendData!)
            : 0;
          const isPositive = percentageChange >= 0;
          const change = hasTrend && (
            <span
              className={`rounded px-1.5 py-1 text-[9px] font-semibold ${
                isPositive
                  ? 'bg-[#f1f7f7] text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {isPositive ? '+' : ''}
              {percentageChange.toFixed(1)}%
            </span>
          );

          return (
            <div
              key={stat.id}
              className="rounded-xl border border-[#dfdfdf] bg-[#f7f7f7]"
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

              <Card
                className={`gap-3 space-y-3 border-x-0 border-b-0 border-[#dfdfdf] ${isAdminCard ? 'py-3' : ''}`}
              >
                {isAdminCard ? (
                  <div className="flex items-start justify-between px-8 py-2">
                    <div className="flex flex-1 items-center gap-3">
                      <p className="text-2xl font-semibold text-gray-900">
                        {stat.value}
                      </p>
                      {change}
                    </div>
                    <button
                      onClick={handleAddAdmin}
                      title="Join an agency from your profile"
                      className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-gray-600 hover:bg-gray-300"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between px-8">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="text-2xl font-semibold text-gray-900">
                          {stat.value}
                        </p>
                        {change}
                      </div>
                      {stat.note && (
                        <p className="mt-1 text-[11px] text-gray-500">
                          {stat.note}
                        </p>
                      )}
                    </div>
                    {hasTrend && (
                      <div className="ml-4 flex items-end">
                        <TrendLine data={stat.trendData!} />
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
