"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatComponentType } from "@/lib/dashboard/calculations";
import type { ComponentTypeData } from "@/lib/dashboard/queries";

interface ComponentTypeChartProps {
  data: ComponentTypeData[];
  loading?: boolean;
}

const COLORS = ["#3b82f6", "#ef6537", "#f59e0b", "#10b981"];

export default function ComponentTypeChart({
  data,
  loading = false,
}: ComponentTypeChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-[#ced1cd] p-6">
        <h3 className="text-lg font-semibold mb-4">
          Most Common Component Problems
        </h3>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-[#ced1cd] p-6">
        <h3 className="text-lg font-semibold mb-4">
          Most Common Component Problems
        </h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
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
    <div className="bg-white rounded-lg border border-[#ced1cd] p-6">
      <h3 className="text-lg font-semibold mb-4">
        Most Common Component Problems
      </h3>
      <div className="flex flex-col md:flex-row gap-6 items-center">
        {/* Left: Donut chart */}
        <div className="w-full md:w-1/2 flex items-center justify-center relative">
          <div className="w-full h-[360px] max-w-[440px]">
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
            <div className="absolute left-0 right-0 top-0 bottom-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-2xl font-extrabold text-gray-900">{total}</p>
            </div>
          </div>
        </div>

        {/* Right: Legend with percentages */}
        <div className="w-full md:w-1/2 flex flex-col justify-center h-full">
          <div className="space-y-3">
            {chartData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full shadow-sm"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm font-medium text-gray-700">{item.name}</span>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">{item.value} issue{item.value !== 1 ? 's' : ''}</span>
                  <span className="text-sm font-semibold text-gray-900 w-16 text-right">{((item.value / total) * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
