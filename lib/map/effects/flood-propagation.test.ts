import { describe, expect, it, vi } from 'vitest';

import {
  buildNodeFloodFeatures,
  floodHeatmapWeight,
} from './flood-propagation';
import type { NodeCoordinates, NodeDetails } from '@/types/simulation';

function node(id: string, floodVolume: number): NodeDetails {
  return {
    Node_ID: id,
    Vulnerability_Category: 'High',
    Vulnerability_Rank: 4,
    Cluster: 0,
    Cluster_Score: 0,
    YR: 10,
    Time_Before_Overflow: 30,
    Hours_Flooded: 2,
    Maximum_Rate: 0.5,
    Time_Of_Max_Occurence: 15,
    Total_Flood_Volume: floodVolume,
  };
}

const locations: NodeCoordinates[] = [
  { id: 'I-1', coordinates: [123.95, 10.32] },
  { id: 'I-2', coordinates: [123.96, 10.33] },
];

describe('buildNodeFloodFeatures', () => {
  it('emits a point per flooded node', () => {
    const features = buildNodeFloodFeatures(
      [node('I-1', 5), node('I-2', 2)],
      locations
    );
    expect(features).toHaveLength(2);
    expect(features[0].geometry).toEqual({
      type: 'Point',
      coordinates: [123.95, 10.32],
    });
  });

  it('skips nodes that did not flood', () => {
    const features = buildNodeFloodFeatures(
      [node('I-1', 0), node('I-2', 3)],
      locations
    );
    expect(features).toHaveLength(1);
    expect(features[0].properties?.nodeId).toBe('I-2');
  });

  it('skips nodes with no known coordinates and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const features = buildNodeFloodFeatures([node('I-404', 5)], locations);
    expect(features).toHaveLength(0);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('carries the flooding figures onto each point', () => {
    const [feature] = buildNodeFloodFeatures([node('I-1', 7.5)], locations);
    expect(feature.properties).toMatchObject({
      source: 'node',
      nodeId: 'I-1',
      vulnerability: 'High',
      floodVolume: 7.5,
      maximumRate: 0.5,
      hoursFlooded: 2,
    });
  });

  it('gives each point its own animation phase and wobble', () => {
    // A shared phase would make every point pulse in lockstep.
    const features = buildNodeFloodFeatures(
      [node('I-1', 5), node('I-2', 5)],
      locations
    );
    const phases = features.map((f) => f.properties?.phase);
    expect(phases[0]).not.toBe(phases[1]);
    for (const feature of features) {
      expect(feature.properties?.phase).toBeGreaterThanOrEqual(0);
      expect(feature.properties?.phase).toBeLessThanOrEqual(Math.PI * 2);
      expect(feature.properties?.offsetDistance).toBeLessThan(0.0001);
    }
  });

  it('returns nothing for no results', () => {
    expect(buildNodeFloodFeatures([], locations)).toEqual([]);
  });
});

describe('floodHeatmapWeight', () => {
  it.each([
    // A live simulation's categories. These used to all fall through to the
    // 0.2 floor, because the heatmap only knew the stored "X Risk" labels.
    ['High', 5],
    ['Medium', 1.5],
    ['Low', 0.6],
    ['No hazard', 0.2],
    // The stored scenarios' categories.
    ['High Risk', 5],
    ['Medium Risk', 1.5],
    ['Low Risk', 0.6],
    ['No Risk', 0.2],
  ])('weights a %s node at %s', (category, weight) => {
    expect(floodHeatmapWeight(category)).toBe(weight);
  });

  it('puts the weight on each point for the heatmap to read', () => {
    const [feature] = buildNodeFloodFeatures([node('I-1', 5)], locations);
    expect(feature.properties?.hazardWeight).toBe(5);
  });
});
