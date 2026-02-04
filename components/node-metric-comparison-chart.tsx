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

type YearOption = 2 | 5 | 10 | 15 | 20 | 25 | 50 | 100;

interface NodeDetails {
  Node_ID: string;
  Vulnerability_Category: string;
  Vulnerability_Rank: number;
  Cluster: number;
  Cluster_Score: number;
  YR: number;
  Time_Before_Overflow: number;
  Hours_Flooded: number;
  Maximum_Rate: number;
  Time_Of_Max_Occurence: number;
  Total_Flood_Volume: number;
}

type MetricKey =
  | 'Time_Before_Overflow'
  | 'Hours_Flooded'
  | 'Maximum_Rate'
  | 'Time_Of_Max_Occurence'
  | 'Total_Flood_Volume';

interface NodeMetricComparisonChartProps {
  nodeId: string;
  year: YearOption;
  metricKey: MetricKey;
  metricLabel: string;
  maxNodes?: number;
  allNodesData: NodeDetails[];
}

interface ChartDataPoint {
  nodeId: string;
  value: number;
  isSelected: boolean;
  rank: number;
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
        setTotalNodes(allNodesData.length);

        // Sort by the specified metric descending
        const sortedNodes = [...allNodesData].sort(
          (a, b) => b[metricKey] - a[metricKey]
        );

        // Find the selected node
        const selectedNode = sortedNodes.find(
          (node) => node.Node_ID === nodeId
        );
        const selectedNodeIndex = sortedNodes.findIndex(
          (node) => node.Node_ID === nodeId
        );

        // Take top N nodes or ensure selected node is included
        let nodesToShow = sortedNodes.slice(0, maxNodes);

        // If selected node is not in top N, add it
        if (selectedNode && selectedNodeIndex >= maxNodes) {
          nodesToShow = [...nodesToShow, selectedNode];
        }

        // Transform to chart format
        const transformed: ChartDataPoint[] = nodesToShow.map((node) => ({
          nodeId: node.Node_ID,
          value: node[metricKey],
          isSelected: node.Node_ID === nodeId,
          rank: sortedNodes.findIndex((n) => n.Node_ID === node.Node_ID) + 1,
        }));

        // Sort again by value for consistent display
        transformed.sort((a, b) => b.value - a.value);

        setChartData(transformed);

        if (selectedNode) {
          setSelectedNodeData({
            nodeId: selectedNode.Node_ID,
            value: selectedNode[metricKey],
            isSelected: true,
            rank: selectedNodeIndex + 1,
          });
        }
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
                  fill={`hsl(${
                    240 -
                    (entry.value / Math.max(...chartData.map((d) => d.value))) *
                      240
                  }, 70%, 50%)`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}
