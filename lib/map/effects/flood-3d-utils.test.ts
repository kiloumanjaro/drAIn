import { describe, expect, it } from 'vitest';
import type { NodeCoordinates, NodeDetails } from '@/types/simulation';
import { createFloodAlongPipes } from './flood-3d-utils';

function makeNode(id: string, category: string, volume: number): NodeDetails {
  return {
    Node_ID: id,
    Vulnerability_Category: category,
    Vulnerability_Rank: 0,
    Cluster: null,
    Cluster_Score: null,
    YR: null,
    Time_Before_Overflow: null,
    Hours_Flooded: 0,
    Maximum_Rate: 0,
    Time_Of_Max_Occurence: 0,
    Total_Flood_Volume: volume,
  };
}

function makeCoord(id: string, coordinates: [number, number]): NodeCoordinates {
  return { id, coordinates };
}

type PipeFeature = Parameters<typeof createFloodAlongPipes>[2][number];

function makePipe(name: string, coordinates: [number, number][]): PipeFeature {
  return {
    type: 'Feature',
    properties: { Name: name, Pipe_Lngth: 100 },
    geometry: { type: 'LineString', coordinates },
  };
}

// Node positions chosen well within the 0.0008-degree snapping radius of
// the pipe endpoints they should match, and far outside everyone else's.
const N1: [number, number] = [0, 0];
const N2: [number, number] = [0.01, 0];

describe('createFloodAlongPipes', () => {
  it('returns no features when nothing is flooded', () => {
    const fc = createFloodAlongPipes(
      [makeNode('a', 'High Risk', 0)], // zero volume means not flooded
      [makeCoord('a', N1), makeCoord('b', N2)],
      [makePipe('P1', [N1, N2])]
    );
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features).toEqual([]);
  });

  it('draws nothing when only one end of a pipe is flooded', () => {
    // Strict matching: a single red node must not paint every pipe near it.
    const fc = createFloodAlongPipes(
      [makeNode('a', 'High Risk', 10)],
      [makeCoord('a', N1), makeCoord('b', N2)],
      [makePipe('P1', [N1, N2])]
    );
    expect(fc.features).toEqual([]);
  });

  it('paints one single-colour feature when both ends share a category', () => {
    const fc = createFloodAlongPipes(
      [makeNode('a', 'High Risk', 10), makeNode('b', 'High Risk', 30)],
      [makeCoord('a', N1), makeCoord('b', N2)],
      [makePipe('P1', [N1, N2])]
    );
    expect(fc.features).toHaveLength(1);
    const props = fc.features[0].properties!;
    expect(props.color).toBe('rgb(211, 47, 47)');
    // Width styling is driven by the average of the two node volumes.
    expect(props.floodVolume).toBe(20);
    expect(props.pipeName).toBe('P1');
  });

  it('subdivides a straight pipe into a ten-step gradient between colours', () => {
    const fc = createFloodAlongPipes(
      [makeNode('a', 'High Risk', 10), makeNode('b', 'Low Risk', 10)],
      [makeCoord('a', N1), makeCoord('b', N2)],
      [makePipe('P1', [N1, N2])]
    );
    expect(fc.features).toHaveLength(10);
    const colors = fc.features.map((f) => f.properties!.color);
    // The first segment leans red, the last leans yellow, no two equal
    // neighbours anywhere - that is what makes it read as a gradient.
    expect(colors[0]).not.toBe(colors[9]);
    expect(new Set(colors).size).toBe(10);
  });

  it('ignores pipes whose endpoints are far from any flooded node', () => {
    // Medium-risk nodes, so the separate high-risk connector pass stays out
    // of the picture and any feature here could only come from the pipe.
    const fc = createFloodAlongPipes(
      [makeNode('a', 'Medium Risk', 10), makeNode('b', 'Medium Risk', 10)],
      [makeCoord('a', N1), makeCoord('b', N2)],
      // 0.01 degrees away from both nodes - outside the snap radius.
      [
        makePipe('P1', [
          [0.02, 0.02],
          [0.03, 0.02],
        ]),
      ]
    );
    expect(fc.features).toEqual([]);
  });

  it('connects an isolated high-risk node to the nearest at-risk node', () => {
    // The high-risk node has no pipe near it, so a direct line is drawn to
    // the nearest non-green node to keep it visible on the map.
    const LONELY: [number, number] = [0.05, 0.05];
    const fc = createFloodAlongPipes(
      [
        makeNode('red', 'High Risk', 10),
        makeNode('yellow', 'Low Risk', 10),
        makeNode('green', 'No Risk', 10),
      ],
      [
        makeCoord('red', LONELY),
        makeCoord('yellow', N1),
        // Green is nearer to the red node but must be skipped.
        makeCoord('green', [0.049, 0.05]),
      ],
      [] // no pipes at all
    );
    expect(fc.features.length).toBeGreaterThan(0);
    const names = new Set(fc.features.map((f) => f.properties!.pipeName));
    expect(names).toEqual(new Set(['high-risk-connection-red']));
    expect(fc.features[0].properties!.startNodeId).toBe('red');
    expect(fc.features[0].properties!.endNodeId).toBe('yellow');
  });

  it('does not add a connector when the high-risk node reached a pipe', () => {
    const fc = createFloodAlongPipes(
      [makeNode('a', 'High Risk', 10), makeNode('b', 'Medium Risk', 10)],
      [makeCoord('a', N1), makeCoord('b', N2)],
      [makePipe('P1', [N1, N2])]
    );
    const connectors = fc.features.filter((f) =>
      String(f.properties!.pipeName).startsWith('high-risk-connection')
    );
    expect(connectors).toEqual([]);
  });

  it('skips degenerate pipes with fewer than two coordinates', () => {
    const fc = createFloodAlongPipes(
      [makeNode('a', 'Low Risk', 10), makeNode('b', 'Low Risk', 10)],
      [makeCoord('a', N1), makeCoord('b', N2)],
      [makePipe('P1', [N1])]
    );
    expect(fc.features).toEqual([]);
  });
});
