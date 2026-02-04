'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import type { RepairTrendData } from '@/lib/dashboard/queries';

interface RepairTrendChartProps {
  data: RepairTrendData[];
  loading?: boolean;
}

export default function RepairTrendChart({
  data,
  loading = false,
}: RepairTrendChartProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-[#ced1cd] bg-white p-6">
        <Skeleton className="mb-4 h-6 w-48" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-[#ced1cd] bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">
          No repair data available for the last 30 days
        </h3>
        <div className="py-8 text-center text-gray-500">
          <p>No repair data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#ced1cd] bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold">
        Repair Time Trend (Last 30 Days)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={(date: string) => {
              const d = new Date(date);
              return `${d.getMonth() + 1}/${d.getDate()}`;
            }}
          />
          <YAxis
            label={{
              value: 'Average Days',
              angle: -90,
              position: 'insideLeft',
            }}
          />
          <Tooltip
            labelFormatter={(date: string) => {
              const d = new Date(date);
              return d.toLocaleDateString();
            }}
            formatter={(value: number) => `${value.toFixed(1)} days`}
          />
          <Legend />
          <Bar
            dataKey="averageDays"
            fill="#3b82f6"
            name="Average Repair Time"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
