'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Info } from 'lucide-react';
import { formatComponentType } from '@/lib/dashboard/calculations';
import type { ComponentTypeData } from '@/lib/dashboard/queries';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ComponentTypeChartProps {
  data: ComponentTypeData[];
  loading?: boolean;
  onViewReports?: () => void;
}

const COLORS = ['#3b82f6', '#ef6537', '#f59e0b', '#10b981'];

export default function ComponentTypeChart({
  data,
  loading = false,
  onViewReports,
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

  // Format data for table
  const chartData = data.map((item) => ({
    name: formatComponentType(item.type),
    value: item.count,
    type: item.type,
  }));

  const total = chartData.reduce((sum, it) => sum + it.value, 0);

  return (
    <TooltipProvider>
      <div>
        <div className="rounded-t-2xl border border-[#ced1cd] bg-[#f7f7f7]">
          <table className="w-full text-sm">
            <thead>
              <tr className="rounded-2xl border-b border-[#ced1cd]">
                <th className="w-[250px] px-4 py-3 text-center font-normal text-gray-700">
                  <div className="flex items-center justify-center gap-2">
                    <span>Chart</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 cursor-help opacity-70" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          This shows the distribution of reports per component
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>
                <th className="w-[200px] px-4 py-3 text-center font-normal text-gray-700">
                  Component Type
                </th>
                <th className="px-4 py-3 text-center font-normal text-gray-700">
                  Number of Issues
                </th>
                <th className="px-4 py-3 text-center font-normal text-gray-700">
                  Percentage
                </th>
              </tr>
            </thead>

            <tbody>
              {/* Pie chart row - spans all rows in first column */}
              <tr>
                <td
                  rowSpan={chartData.length}
                  className="bg-white px-3 py-2 align-middle"
                >
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={false}
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={2}
                          cornerRadius={4}
                          dataKey="value"
                        >
                          {chartData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </td>
                {/* First data row */}
                <td className="bg-white px-3 py-2">
                  <div className="flex items-center gap-3 pl-12 whitespace-nowrap">
                    <div
                      className="ml-2 h-3 w-3 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: COLORS[0] }}
                    />
                    <span className="text-sm text-gray-700">
                      {chartData[0]?.name}
                    </span>
                  </div>
                </td>
                <td className="bg-white px-3 py-2 text-center text-sm text-gray-700">
                  {chartData[0]?.value} issue
                  {chartData[0]?.value !== 1 ? 's' : ''}
                </td>
                <td className="bg-white px-3 py-2 text-center text-sm text-gray-700">
                  {((chartData[0]?.value / total) * 100).toFixed(1)}%
                </td>
              </tr>
              {/* Remaining data rows */}
              {chartData.slice(1).map((item, index) => (
                <tr key={item.name} className="bg-white">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3 pl-12 whitespace-nowrap">
                      <div
                        className="ml-2 h-3 w-3 flex-shrink-0 rounded-full"
                        style={{
                          backgroundColor: COLORS[(index + 1) % COLORS.length],
                        }}
                      />
                      <span className="text-sm text-gray-700">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center text-sm text-gray-700">
                    {item.value} issue{item.value !== 1 ? 's' : ''}
                  </td>
                  <td className="px-3 py-2 text-center text-sm text-gray-700">
                    {((item.value / total) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <button
        onClick={onViewReports}
        className="w-full rounded-b-2xl border-x border-b border-[#ced1cd] bg-[#f7f7f7] p-2.5 text-center text-sm text-gray-700 transition-colors hover:bg-[#e8e8e8]"
      >
        View Reports
      </button>
    </TooltipProvider>
  );
}
