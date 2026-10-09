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

// From tablet width to a small laptop the card is the left two thirds of a
// row and narrower than the table's phone width (about 370px at 768, 540px
// at 1024), so there the columns give up their fixed widths and padding and
// share what room there is. Phones keep the full-width table and scroll it;
// wider screens have room for it as it is.
const HEAD_CELL =
  'px-4 py-3 text-center font-normal text-gray-700 md:max-xl:px-1.5 md:max-xl:text-xs';
const BODY_CELL = 'px-3 py-0 leading-none md:max-xl:px-1.5';
const NUMBER_CELL = `${BODY_CELL} text-center text-sm text-gray-700`;
// A two-word type ("Storm Drain") may take two lines in the narrow layout.
const LEGEND_CELL = `${BODY_CELL} md:max-xl:leading-tight`;
const LEGEND_ROW =
  'flex items-center gap-3 pl-12 whitespace-nowrap md:max-xl:gap-2 md:max-xl:pl-1 md:max-xl:whitespace-normal';
const LEGEND_DOT = 'ml-2 h-3 w-3 flex-shrink-0 rounded-full md:max-xl:ml-0';

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
  // With no reports yet every share is 0 of 0; say 0%, not "NaN%".
  const share = (value: number) =>
    `${total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'}%`;

  return (
    <TooltipProvider>
      <div>
        {/* Four columns at their full widths need about 620px; phones scroll
            the card. From tablet width up the table fits the card instead. */}
        <div className="overflow-x-auto rounded-t-2xl border border-[#ced1cd] bg-[#f7f7f7]">
          <table className="w-full min-w-[620px] text-sm md:min-w-0">
            <thead>
              <tr className="rounded-2xl border-b border-[#ced1cd]">
                <th className={`w-[250px] md:max-xl:w-[36%] ${HEAD_CELL}`}>
                  <div className="flex items-center justify-center gap-2">
                    <span>Pie Chart</span>
                    <Tooltip>
                      <TooltipTrigger
                        type="button"
                        aria-label="About the pie chart"
                        className="focus-visible:ring-ring inline-flex cursor-help rounded-full focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <Info
                          aria-hidden="true"
                          className="h-3.5 w-3.5 cursor-help opacity-70"
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          This shows the distribution of reports per component
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </th>
                <th className={`w-[200px] md:max-xl:w-auto ${HEAD_CELL}`}>
                  Component Type
                </th>
                <th className={HEAD_CELL}>Number of Issues</th>
                <th className={HEAD_CELL}>Percentage</th>
              </tr>
            </thead>

            <tbody>
              {/* Pie chart row - spans all rows in first column */}
              <tr>
                <td
                  rowSpan={chartData.length}
                  className="bg-white px-3 py-0 align-middle md:max-xl:px-1.5"
                >
                  {/* The rows beside it give the same numbers as text. */}
                  <div aria-hidden="true" className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={false}
                          // Shares of the room the chart has, so the ring
                          // shrinks with a narrow column: 55 and 85px in
                          // the full 250px one.
                          innerRadius="52%"
                          outerRadius="81%"
                          paddingAngle={2}
                          cornerRadius={4}
                          dataKey="value"
                          // Hidden from assistive technology above, so it
                          // must not take a tab stop either.
                          rootTabIndex={-1}
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
                <td className={`bg-white ${LEGEND_CELL}`}>
                  <div className={LEGEND_ROW}>
                    <div
                      className={LEGEND_DOT}
                      style={{ backgroundColor: COLORS[0] }}
                    />
                    <span className="text-sm text-gray-700">
                      {chartData[0]?.name}
                    </span>
                  </div>
                </td>
                <td className={`bg-white ${NUMBER_CELL}`}>
                  {chartData[0]?.value} issue
                  {chartData[0]?.value !== 1 ? 's' : ''}
                </td>
                <td className={`bg-white ${NUMBER_CELL}`}>
                  {share(chartData[0]?.value ?? 0)}
                </td>
              </tr>
              {/* Remaining data rows */}
              {chartData.slice(1).map((item, index) => (
                <tr key={item.name} className="bg-white">
                  <td className={LEGEND_CELL}>
                    <div className={LEGEND_ROW}>
                      <div
                        className={LEGEND_DOT}
                        style={{
                          backgroundColor: COLORS[(index + 1) % COLORS.length],
                        }}
                      />
                      <span className="text-sm text-gray-700">{item.name}</span>
                    </div>
                  </td>
                  <td className={NUMBER_CELL}>
                    {item.value} issue{item.value !== 1 ? 's' : ''}
                  </td>
                  <td className={NUMBER_CELL}>{share(item.value)}</td>
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
