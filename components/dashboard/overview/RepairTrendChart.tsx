"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { RepairTrendData } from "@/lib/dashboard/queries";

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
      <div className="bg-white rounded-lg border border-[#ced1cd] p-6">
        <h3 className="text-lg font-semibold mb-4">Repair Time Trend (Last 30 Days)</h3>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-[#ced1cd] p-6">
        <h3 className="text-lg font-semibold mb-4">Repair Time Trend (Last 30 Days)</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>No repair data available for the last 30 days</p>
        </div>
      </div>
    );
  }

  // Format data for chart
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    days: item.averageDays,
  }));

  return (
    <div className="bg-white rounded-lg border border-[#ced1cd] p-6">
      <h3 className="text-lg font-semibold mb-4">Repair Time Trend (Last 30 Days)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            stroke="#666"
          />
          <YAxis
            label={{ value: "Days", angle: -90, position: "insideLeft" }}
            tick={{ fontSize: 12 }}
            stroke="#666"
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
            formatter={(value) => `${value} days`}
          />
          <Line
            type="monotone"
            dataKey="days"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: "#3b82f6", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-4 text-sm text-gray-600">
        <p>Average time from report submission to completion over the last 30 days.</p>
      </div>
    </div>
  );
}
