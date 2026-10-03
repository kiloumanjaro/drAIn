'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { formatComponentType } from '@/lib/dashboard/calculations';
import type { ComponentTypeData } from '@/lib/dashboard/queries';

interface CustomPieChartProps {
  data: ComponentTypeData[];
  loading?: boolean;
  colors?: string[];
  title?: string;
  showLegend?: boolean;
  showPercentage?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

// Color palette - fully customizable
const DEFAULT_COLORS = ['#3b82f6', '#ef6537', '#f59e0b', '#10b981'];

export default function CustomPieChart({
  data,
  loading = false,
  colors = DEFAULT_COLORS,
  title = 'Most Common Component Problems',
  showLegend = true,
  showPercentage = true,
  innerRadius = 0,
  outerRadius = 80,
}: CustomPieChartProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-[#ced1cd] bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">{title}</h3>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-[#ced1cd] bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">{title}</h3>
        <div className="flex h-64 items-center justify-center text-gray-500">
          <p>No data available</p>
        </div>
      </div>
    );
  }

  // Format data for pie chart
  const chartData = data.map((item) => ({
    name: formatComponentType(item.type),
    value: item.count,
    type: item.type,
  }));

  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rounded-lg border border-[#ced1cd] bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) =>
              showPercentage ? `${name}: ${(percent * 100).toFixed(0)}%` : name
            }
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Custom Legend */}
      {showLegend && (
        <div className="mt-6 border-t border-gray-200 pt-6">
          <div className="space-y-3">
            {chartData.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-sm"
                    style={{
                      backgroundColor: colors[index % colors.length],
                    }}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    {item.value} issue{item.value !== 1 ? 's' : ''}
                  </span>
                  <span className="w-12 text-right text-sm font-semibold text-gray-900">
                    {((item.value / totalValue) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 border-t border-gray-200 pt-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="mb-1 text-xs text-gray-600">Total Issues</p>
            <p className="text-2xl font-bold text-gray-900">{totalValue}</p>
          </div>
          <div className="text-center">
            <p className="mb-1 text-xs text-gray-600">Component Types</p>
            <p className="text-2xl font-bold text-gray-900">
              {chartData.length}
            </p>
          </div>
          <div className="text-center">
            <p className="mb-1 text-xs text-gray-600">Average</p>
            <p className="text-2xl font-bold text-gray-900">
              {(totalValue / chartData.length).toFixed(1)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
