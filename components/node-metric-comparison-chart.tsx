'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import {
  buildMetricComparison,
  type ChartDataPoint,
  METRIC_HIGHER_IS_WORSE,
  type MetricKey,
  metricBarHue,
} from '@/lib/vulnerabilities/metric-comparison';
import type { NodeDetails } from '@/types/simulation';

type YearOption = 2 | 5 | 10 | 15 | 20 | 25 | 50 | 100;

interface NodeMetricComparisonChartProps {
  nodeId: string;
  year: YearOption;
  metricKey: MetricKey;
  metricLabel: string;
  maxNodes?: number;
  allNodesData: NodeDetails[];
}

export function NodeMetricComparisonChart({
  nodeId,
  year,
  metricKey,
  metricLabel,
  maxNodes = 50,
  allNodesData,
}: NodeMetricComparisonChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [selectedNodeData, setSelectedNodeData] =
    useState<ChartDataPoint | null>(null);
  const [totalNodes, setTotalNodes] = useState(0);

  useEffect(() => {
    const processData = () => {
      try {
        // Ranked worst first, in the metric's own direction, with nodes
        // that have no value for it left out.
        const { chartData, selected, totalNodes } = buildMetricComparison(
          allNodesData,
          nodeId,
          metricKey,
          maxNodes
        );
        setTotalNodes(totalNodes);
        setChartData(chartData);
        // Cleared when the node has no value for this metric, rather than
        // keeping the rank of a previously selected node.
        setSelectedNodeData(selected);
      } catch (error) {
        console.error('Error processing chart data:', error);
      }
    };

    processData();
  }, [nodeId, year, metricKey, maxNodes, allNodesData]);

  const chartConfig = {
    value: {
      label: metricLabel,
    },
  };

  return (
    <div className="w-full pt-2">
      {selectedNodeData && (
        <div className="flex justify-center">
          <div className="flex h-6 w-48 items-center justify-center rounded-xl border border-gray-500/20 bg-gray-500/10 text-xs text-gray-700 dark:text-gray-400">
            Ranked #{selectedNodeData.rank} out of {totalNodes} nodes
          </div>
        </div>
      )}
      <ChartContainer config={chartConfig} className="h-[200px] w-full pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <XAxis
              dataKey="rank"
              tick={{ fontSize: 10 }}
              label={{
                value: 'Node Rank',
                position: 'insideBottom',
                offset: -5,
                fontSize: 10,
              }}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;

                const data = payload[0].payload as ChartDataPoint;
                return (
                  <div className="bg-background border-border rounded-lg border px-3 py-2 shadow-lg">
                    <div className="space-y-1 text-xs">
                      <div className="font-semibold">
                        Node: {data.nodeId}
                        {data.isSelected && (
                          <span className="text-primary ml-2">(Selected)</span>
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        Rank: #{data.rank}
                      </div>
                      <div className="text-foreground font-mono">
                        {data.value.toFixed(3)}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`hsl(${metricBarHue(
                    entry.value,
                    chartData.map((d) => d.value),
                    METRIC_HIGHER_IS_WORSE[metricKey]
                  )}, 70%, 50%)`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
