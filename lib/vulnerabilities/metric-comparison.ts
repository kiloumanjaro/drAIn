import type { NodeDetails } from '@/types/simulation';

/** The per-node figures the comparison chart can rank on. */
export type MetricKey =
  | 'Time_Before_Overflow'
  | 'Hours_Flooded'
  | 'Maximum_Rate'
  | 'Time_Of_Max_Occurence'
  | 'Total_Flood_Volume';

/**
 * Whether a bigger value means a worse node. Rank 1 is always the worst.
 *
 * Time before overflow runs the other way: a node that overflows after five
 * minutes is in more trouble than one that holds out for two hours.
 */
export const METRIC_HIGHER_IS_WORSE: Record<MetricKey, boolean> = {
  Time_Before_Overflow: false,
  Hours_Flooded: true,
  Maximum_Rate: true,
  Time_Of_Max_Occurence: true,
  Total_Flood_Volume: true,
};

export interface ChartDataPoint {
  nodeId: string;
  value: number;
  isSelected: boolean;
  /** 1 is the worst node for this metric. */
  rank: number;
}

export interface MetricComparison {
  /** The worst `maxNodes`, plus the selected node if it ranks below them. */
  chartData: ChartDataPoint[];
  selected: ChartDataPoint | null;
  /** How many nodes have a value for this metric. */
  totalNodes: number;
}

/**
 * Rank every node on one metric, worst first, and pick the bars to draw.
 *
 * Nodes with no value for the metric are left out entirely: a node that
 * never overflowed has no time to overflow, not a very long one.
 */
export function buildMetricComparison(
  allNodesData: NodeDetails[],
  nodeId: string,
  metricKey: MetricKey,
  maxNodes: number
): MetricComparison {
  const measured = allNodesData.filter(
    (node): node is NodeDetails & Record<MetricKey, number> =>
      typeof node[metricKey] === 'number' && Number.isFinite(node[metricKey])
  );

  const higherIsWorse = METRIC_HIGHER_IS_WORSE[metricKey];
  const ranked = [...measured].sort((a, b) =>
    higherIsWorse ? b[metricKey] - a[metricKey] : a[metricKey] - b[metricKey]
  );

  const points: ChartDataPoint[] = ranked.map((node, index) => ({
    nodeId: node.Node_ID,
    value: node[metricKey],
    isSelected: node.Node_ID === nodeId,
    rank: index + 1,
  }));

  const selected = points.find((point) => point.isSelected) ?? null;
  const chartData = points.slice(0, maxNodes);
  if (selected && selected.rank > maxNodes) chartData.push(selected);

  return { chartData, selected, totalNodes: measured.length };
}

/**
 * Bar hue, from blue (240) for the best value shown to red (0) for the worst.
 *
 * Scaled against the largest value, as before, but in the metric's own
 * direction: time before overflow used to colour its longest, safest time
 * red. A chart of all zeros used to divide 0 by 0 and hand the browser a
 * NaN hue; with nothing to scale by, zero counts as the low end.
 */
export function metricBarHue(
  value: number,
  values: number[],
  higherIsWorse: boolean
): number {
  const max = Math.max(0, ...values.filter(Number.isFinite));
  const ratio = max > 0 && Number.isFinite(value) ? value / max : 0;
  const clamped = Math.min(1, Math.max(0, ratio));
  return higherIsWorse ? 240 - clamped * 240 : clamped * 240;
}
