import { describe, expect, it } from 'vitest';

import type { NodeDetails } from '@/types/simulation';

import { buildMetricComparison, metricBarHue } from './metric-comparison';

function node(id: string, overrides: Partial<NodeDetails> = {}): NodeDetails {
  return {
    Node_ID: id,
    Vulnerability_Category: 'High',
    Vulnerability_Rank: 4,
    Cluster: null,
    Cluster_Score: null,
    YR: null,
    Time_Before_Overflow: null,
    Hours_Flooded: 0,
    Maximum_Rate: 0,
    Time_Of_Max_Occurence: 0,
    Total_Flood_Volume: 0,
    ...overrides,
  };
}

describe('buildMetricComparison', () => {
  it('ranks the biggest flood volume first', () => {
    const { chartData } = buildMetricComparison(
      [
        node('A', { Total_Flood_Volume: 1 }),
        node('B', { Total_Flood_Volume: 9 }),
        node('C', { Total_Flood_Volume: 4 }),
      ],
      'A',
      'Total_Flood_Volume',
      50
    );
    expect(chartData.map((p) => [p.nodeId, p.rank])).toEqual([
      ['B', 1],
      ['C', 2],
      ['A', 3],
    ]);
  });

  it('ranks the shortest time before overflow first', () => {
    // Overflowing after 5 minutes is worse than after 90. This used to
    // sort descending like every other metric, so the safest node was #1.
    const { chartData, selected } = buildMetricComparison(
      [
        node('slow', { Time_Before_Overflow: 90 }),
        node('fast', { Time_Before_Overflow: 5 }),
        node('mid', { Time_Before_Overflow: 30 }),
      ],
      'fast',
      'Time_Before_Overflow',
      50
    );
    expect(chartData.map((p) => p.nodeId)).toEqual(['fast', 'mid', 'slow']);
    expect(selected?.rank).toBe(1);
  });

  it('leaves out nodes with no value for the metric', () => {
    const { totalNodes, chartData } = buildMetricComparison(
      [
        node('A', { Time_Before_Overflow: 12 }),
        node('never', { Time_Before_Overflow: null }),
      ],
      'A',
      'Time_Before_Overflow',
      50
    );
    expect(totalNodes).toBe(1);
    expect(chartData.map((p) => p.nodeId)).toEqual(['A']);
  });

  it('adds the selected node after the top N when it ranks below them', () => {
    const nodes = [5, 4, 3, 2, 1].map((v, i) =>
      node(`N${i}`, { Hours_Flooded: v })
    );
    const { chartData, selected } = buildMetricComparison(
      nodes,
      'N4',
      'Hours_Flooded',
      2
    );
    expect(chartData.map((p) => p.nodeId)).toEqual(['N0', 'N1', 'N4']);
    expect(selected).toMatchObject({ nodeId: 'N4', rank: 5 });
  });

  it('has no selection when the node has no value', () => {
    const { selected } = buildMetricComparison(
      [node('A', { Hours_Flooded: 1 })],
      'missing',
      'Hours_Flooded',
      50
    );
    expect(selected).toBeNull();
  });
});

describe('metricBarHue', () => {
  it('colours the biggest value red when higher is worse', () => {
    expect(metricBarHue(10, [0, 5, 10], true)).toBe(0);
    expect(metricBarHue(0, [0, 5, 10], true)).toBe(240);
  });

  it('colours the smallest value red when lower is worse', () => {
    // The longest time before overflow is the safest, and used to be red.
    expect(metricBarHue(0, [0, 5, 10], false)).toBe(0);
    expect(metricBarHue(10, [0, 5, 10], false)).toBe(240);
  });

  it.each([true, false])(
    'returns a real hue when every value is zero (higherIsWorse=%s)',
    (higherIsWorse) => {
      // 0 / 0 used to give a NaN hue.
      const hue = metricBarHue(0, [0, 0, 0], higherIsWorse);
      expect(Number.isFinite(hue)).toBe(true);
    }
  );

  it('returns a real hue for an empty set', () => {
    expect(Number.isFinite(metricBarHue(0, [], true))).toBe(true);
  });
});
