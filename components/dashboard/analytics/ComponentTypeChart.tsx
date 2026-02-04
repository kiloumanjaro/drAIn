'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { formatComponentType } from '@/lib/dashboard/calculations';
import type { ComponentTypeData } from '@/lib/dashboard/queries';

interface ComponentTypeChartProps {
  data: ComponentTypeData[];
  loading?: boolean;
}

const COLORS = ['#3b82f6', '#ef6537', '#f59e0b', '#10b981'];

export default function ComponentTypeChart({
  data,
  loading = false,
}: ComponentTypeChartProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-[#ced1cd] bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">
          Most Common Component Problems
        </h3>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-[#ced1cd] bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">
          Most Common Component Problems
        </h3>
        <div className="flex h-64 items-center justify-center text-gray-500">
          <p>No component data available</p>
        </div>
      </div>
    );
  }

  // Format data for pie chart
  const chartData = data.map((item) => ({
    name: formatComponentType(item.type),
    value: item.count,
  }));

  const total = chartData.reduce((sum, it) => sum + it.value, 0);
  const outerRadius = 110;
  const innerRadius = Math.floor(outerRadius * 0.55);

  return (
    <div className="rounded-lg border border-[#ced1cd] bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold">
        Most Common Component Problems
      </h3>
      <div className="flex flex-col items-center justify-center gap-6 md:flex-row">
        {/* Pie: left ~1.3/3 (43.333%) */}
        <div className="relative flex w-full items-center justify-center md:w-[43.333%]">
          <div className="h-[360px] w-full max-w-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={false}
                  innerRadius={innerRadius}
                  outerRadius={outerRadius}
                  paddingAngle={2}
                  cornerRadius={6}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} issues`} />
              </PieChart>
            </ResponsiveContainer>

            {/* Center total */}
            <div className="pointer-events-none absolute top-0 right-0 bottom-0 left-0 flex flex-col items-center justify-center">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-2xl font-extrabold text-gray-900">{total}</p>
            </div>
          </div>
        </div>

        {/* Legend: right ~1.7/3 (56.667%) */}
        <div className="flex w-full flex-col md:w-[56.667%] md:justify-center">
          <div className="w-full pt-2 md:flex md:h-[360px] md:items-center md:pt-0 md:pl-6">
            <div className="flex w-full flex-col gap-3 md:overflow-auto">
              {chartData.map((item, index) => (
                <div
                  key={item.name}
                  className="flex w-full items-center justify-between py-2"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="h-3 w-3 shrink-0 rounded-full shadow-sm"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="truncate text-sm font-medium text-gray-700">
                      {item.name}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    <span className="text-sm text-gray-600">
                      {item.value} issue{item.value !== 1 ? 's' : ''}
                    </span>
                    <span className="w-24 text-right text-sm font-semibold text-gray-900">
                      {((item.value / total) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
