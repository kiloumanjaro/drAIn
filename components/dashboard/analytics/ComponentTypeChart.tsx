"use client";

import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
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
        <h3 className="text-lg font-semibold mb-4">Most Common Component Problems</h3>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-[#ced1cd] p-6">
        <h3 className="text-lg font-semibold mb-4">Most Common Component Problems</h3>
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

  return (
    <div className="bg-white rounded-lg border border-[#ced1cd] p-6">
      <h3 className="text-lg font-semibold mb-4">Most Common Component Problems</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) =>
              `${name}: ${(percent * 100).toFixed(0)}%`
            }
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value} issues`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 text-sm text-gray-600">
        <p>Distribution of issues by drainage component type.</p>
      </div>
    </div>
  );
}
