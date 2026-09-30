'use client';

import { Toggle } from '@/components/ui/toggle';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Info, Power, AlertCircle } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { IconRepeat } from '@tabler/icons-react';
import { useReportCountsByDay } from '@/lib/query/hooks/use-report-queries';

interface ReportsToggleProps {
  isVisible: boolean;
  onToggle: () => void;
  onNavigateToReportForm?: () => void;
  isSimulationMode?: boolean;
}

const chartConfig = {
  count: {
    label: 'Reports',
    color: '#3F83DB',
  },
} satisfies ChartConfig;

export function ReportsToggle({
  isVisible,
  onToggle,
  onNavigateToReportForm,
  isSimulationMode = false,
}: ReportsToggleProps) {
  // Counted per day in the database (report_counts_by_day), not by
  // downloading every report.
  const { data: chartData = [] } = useReportCountsByDay();
  const totalReports = chartData.reduce((sum, day) => sum + day.count, 0);

  return (
    <div className="rounded-xl border border-[#e2e2e2] bg-[#f7f7f7]">
      <div
        className="flex cursor-pointer flex-row items-center justify-between rounded-t-xl px-4 py-2 transition-colors hover:bg-[#e8e8e8]"
        onClick={onNavigateToReportForm}
      >
        <span className="text-xs">Community Reports</span>
        <Info className="h-3.5 w-3.5 opacity-70" />
      </div>

      <Card className="gap-3 border-x-0 pb-4">
        <CardHeader className="flex-col gap-3 pb-0">
          <CardTitle className="flex flex-row">
            <div className="flex flex-row items-center gap-2">
              <IconRepeat className="h-4 w-4" />
              <span>{totalReports} reports</span>
            </div>

            <Toggle
              id="reports-toggle"
              pressed={isVisible}
              onPressedChange={onToggle}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              variant="outline"
              size="sm"
              aria-label="Toggle reports visibility"
              className={`ml-auto cursor-pointer border transition-colors duration-300 ${
                isVisible ? 'border-[#3F83DB]' : 'border-gray-300'
              }`}
            >
              <Power
                className={`h-4 w-4 ${
                  isVisible ? 'text-[#3F83DB]' : 'text-gray-400'
                }`}
              />
            </Toggle>
          </CardTitle>
          <CardDescription className="text-xs">
            Toggle visibility of drainage issue reports on the map
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {isSimulationMode ? (
            <div className="my-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-600" />
              <p className="text-xs text-amber-800">
                Unavailable in simulation mode
              </p>
            </div>
          ) : (
            <>
              {/* Bar Chart */}
              <ChartContainer
                config={chartConfig}
                className="flex h-[100px] w-full max-w-[240px]"
              >
                <BarChart
                  accessibilityLayer
                  data={chartData}
                  margin={{
                    left: 0,
                    right: 0,
                    top: 5,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      });
                    }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        className="w-[150px]"
                        labelFormatter={(value) => {
                          return new Date(value).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          });
                        }}
                      />
                    }
                  />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ChartContainer>
            </>
          )}
        </CardContent>
      </Card>
      <div className="flex items-center justify-end gap-2 px-4 py-2">
        <div className="h-1.5 w-4 rounded-lg bg-[#3F83DB]" />
        <span className="text-xs">Report</span>
      </div>
    </div>
  );
}
