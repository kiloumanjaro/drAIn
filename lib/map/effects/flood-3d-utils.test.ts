import type mapboxgl from 'mapbox-gl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NodeCoordinates, NodeDetails } from '@/types/simulation';
import {
  animateFloodAppearing,
  cancelFloodAppearing,
  createFloodAlongPipes,
  enableFlood3D,
  floodLinesAlongPipes,
} from './flood-3d-utils';
import { buildLineFloodFeatures } from './flood-propagation';
import { resetPipesGeoJSONCache } from './pipes-geojson';

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

  it('takes the first position when a node is listed twice', () => {
    // Only the first position puts node b at the end of the pipe.
    const fc = createFloodAlongPipes(
      [makeNode('a', 'Low Risk', 10), makeNode('b', 'Low Risk', 10)],
      [makeCoord('a', N1), makeCoord('b', N2), makeCoord('b', [0.5, 0.5])],
      [makePipe('P1', [N1, N2])]
    );
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].properties!.endNodeId).toBe('b');
  });

  it('snaps each pipe end to its nearest flooded node among many', () => {
    const fc = createFloodAlongPipes(
      [
        makeNode('a', 'Low Risk', 10),
        makeNode('near-a', 'High Risk', 10),
        makeNode('b', 'Medium Risk', 10),
        makeNode('nowhere', 'High Risk', 10), // flooded, but no position
      ],
      [
        makeCoord('near-a', [0.0005, 0]),
        makeCoord('a', N1),
        makeCoord('b', N2),
      ],
      [makePipe('P1', [N1, N2])]
    );
    const pipeSegments = fc.features.filter(
      (f) => f.properties!.pipeName === 'P1'
    );
    expect(pipeSegments.length).toBeGreaterThan(0);
    for (const segment of pipeSegments) {
      expect(segment.properties!.startNodeId).toBe('a');
      expect(segment.properties!.endNodeId).toBe('b');
    }
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

describe('floodLinesAlongPipes', () => {
  const nodes = [makeNode('a', 'High Risk', 10), makeNode('b', 'Low Risk', 10)];
  const a = makeCoord('a', N1);
  const b = makeCoord('b', N2);
  const pipes = [makePipe('P1', [N1, N2])];

  it('gives the same lines as createFloodAlongPipes', () => {
    expect(floodLinesAlongPipes(nodes, [a, b], pipes)).toEqual(
      createFloodAlongPipes(nodes, [a, b], pipes)
    );
  });

  it('hands back its last answer for the same results, positions and pipes', () => {
    // Each caller builds its own list of positions from the same nodes.
    const first = floodLinesAlongPipes(nodes, [a, b], pipes);
    expect(floodLinesAlongPipes(nodes, [a, b], pipes)).toBe(first);
  });

  it('works the lines out again for other results', () => {
    const first = floodLinesAlongPipes(nodes, [a, b], pipes);
    const again = floodLinesAlongPipes([...nodes], [a, b], pipes);
    expect(again).not.toBe(first);
    expect(again).toEqual(first);
  });

  it('works the lines out again for other pipes', () => {
    const first = floodLinesAlongPipes(nodes, [a, b], pipes);
    expect(floodLinesAlongPipes(nodes, [a, b], [...pipes])).not.toBe(first);
  });

  it('works the lines out again when a node has moved or gone', () => {
    const first = floodLinesAlongPipes(nodes, [a, b], pipes);
    const moved = floodLinesAlongPipes(nodes, [a, makeCoord('b', N2)], pipes);
    expect(moved).not.toBe(first);

    const gone = floodLinesAlongPipes(nodes, [a], pipes);
    expect(gone).not.toBe(moved);
    expect(gone.features).toEqual([]);
  });
});

describe('enableFlood3D', () => {
  const nodes = [makeNode('a', 'High Risk', 10), makeNode('b', 'Low Risk', 10)];
  const inlets = [makeCoord('a', N1)];
  const drains = [makeCoord('b', N2)];
  // The loaded pipes are one object for everyone who asks (pipes-geojson).
  const pipesGeoJSON = {
    type: 'FeatureCollection',
    features: [makePipe('P1', [N1, N2])],
  };

  /** Just enough of a map for the flood layer to be added to. */
  function makeMap() {
    const layers = new Map<string, { paint: Record<string, unknown> }>();
    const sources = new Map<string, { data: unknown }>();
    const setPaintProperty = vi.fn();
    const map = {
      getLayer: (id: string) => layers.get(id),
      removeLayer: (id: string) => layers.delete(id),
      addLayer: (layer: { id: string; paint: Record<string, unknown> }) =>
        layers.set(layer.id, layer),
      getSource: (id: string) => sources.get(id),
      removeSource: (id: string) => sources.delete(id),
      addSource: (id: string, source: { data: unknown }) =>
        sources.set(id, source),
      getStyle: () => ({ layers: [] }),
      moveLayer: vi.fn(),
      setPaintProperty,
      getContainer: () => ({ dataset: {} }),
    } as unknown as mapboxgl.Map;
    return { map, layers, sources, setPaintProperty };
  }

  const stubReducedMotion = (reduced: boolean) =>
    vi.stubGlobal('window', { matchMedia: () => ({ matches: reduced }) });

  let pendingFrames: number;

  beforeEach(() => {
    resetPipesGeoJSONCache();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => pipesGeoJSON,
      }))
    );
    pendingFrames = 0;
    vi.stubGlobal('requestAnimationFrame', () => ++pendingFrames);
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetPipesGeoJSONCache();
  });

  const lineOpacity = (layers: ReturnType<typeof makeMap>['layers']) =>
    layers.get('flood-gradient-layer')?.paint['line-opacity'];

  it('starts invisible and fades in', async () => {
    stubReducedMotion(false);
    const { map, layers, setPaintProperty } = makeMap();
    await enableFlood3D(map, nodes, inlets, drains, { animate: true });

    expect(lineOpacity(layers)).toBe(0);
    expect(setPaintProperty).toHaveBeenCalled();
    expect(pendingFrames).toBe(1);
    cancelFloodAppearing(map);
  });

  it('is simply there, as the fade would leave it, under reduced motion', async () => {
    stubReducedMotion(true);
    const { map, layers, setPaintProperty } = makeMap();
    await enableFlood3D(map, nodes, inlets, drains, { animate: true });

    expect(lineOpacity(layers)).toEqual([
      'interpolate',
      ['linear'],
      ['get', 'floodVolume'],
      0,
      0.4,
      5,
      0.6,
      15,
      0.8,
    ]);
    // No fade: nothing is animated and no frame is asked for.
    expect(setPaintProperty).not.toHaveBeenCalled();
    expect(pendingFrames).toBe(0);
  });

  it('shares its flood lines with the heatmap built from the same result', async () => {
    stubReducedMotion(false);
    const { map, sources } = makeMap();
    const locations = [...inlets, ...drains];

    // What the page does for one result: the heatmap's points, then the lines.
    const nodeFeatures: GeoJSON.Feature[] = [];
    await buildLineFloodFeatures(nodes, locations, nodeFeatures);
    const heatmapLines = floodLinesAlongPipes(
      nodes,
      locations,
      pipesGeoJSON.features
    );
    await enableFlood3D(map, nodes, inlets, drains, { animate: false });

    // Not just equal: the very lines the heatmap was sampled from, so they
    // were worked out once.
    expect(sources.get('flood-3d')?.data).toBe(heatmapLines);
  });
});

describe('animateFloodAppearing', () => {
  let pending: Map<number, () => void>;
  let nextId: number;

  /** Fire the frames that are waiting. */
  const runFrames = () => {
    const callbacks = [...pending.values()];
    pending.clear();
    callbacks.forEach((callback) => callback());
  };

  function makeMap() {
    let hasLayer = true;
    const setPaintProperty = vi.fn();
    const map = {
      getLayer: () => (hasLayer ? { id: 'flood-gradient-layer' } : undefined),
      setPaintProperty,
    } as unknown as mapboxgl.Map;
    return { map, setPaintProperty, removeLayer: () => (hasLayer = false) };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    pending = new Map();
    nextId = 1;
    vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
      pending.set(nextId, callback);
      return nextId++;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      pending.delete(id);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  /** The opacity given to the highest flood volume in a setPaintProperty call. */
  const peakOpacity = (call: unknown[]) => (call[2] as unknown[]).at(-1);

  it('fades in from nothing to full over the duration, easing out', () => {
    const { map, setPaintProperty } = makeMap();
    animateFloodAppearing(map, 3000);
    expect(peakOpacity(setPaintProperty.mock.calls[0])).toBe(0);

    vi.setSystemTime(1500);
    runFrames();
    // Ease-out cubic: 1 - (1 - 0.5)^3 of the way there at half time.
    expect(peakOpacity(setPaintProperty.mock.calls[1])).toBeCloseTo(
      0.8 * 0.875,
      12
    );

    vi.setSystemTime(3000);
    runFrames();
    expect(setPaintProperty.mock.calls[2][2]).toEqual([
      'interpolate',
      ['linear'],
      ['get', 'floodVolume'],
      0,
      0.4,
      5,
      0.6,
      15,
      0.8,
    ]);
    // Finished: nothing further is asked for.
    expect(pending.size).toBe(0);
  });

  it('stops when cancelled, leaving no frame pending', () => {
    const { map, setPaintProperty } = makeMap();
    const cancel = animateFloodAppearing(map, 3000);
    expect(pending.size).toBe(1);

    cancel();
    expect(pending.size).toBe(0);

    vi.setSystemTime(1000);
    runFrames();
    expect(setPaintProperty).toHaveBeenCalledTimes(1);
  });

  it('can be cancelled after it has finished', () => {
    const { map } = makeMap();
    const cancel = animateFloodAppearing(map, 0);
    expect(pending.size).toBe(0);
    expect(() => cancel()).not.toThrow();
  });

  it('is fully there at once when given no time to fade over', () => {
    // 0 / 0 used to give the layer a NaN opacity.
    for (const duration of [0, -500]) {
      const { map, setPaintProperty } = makeMap();
      animateFloodAppearing(map, duration);

      expect(setPaintProperty).toHaveBeenCalledTimes(1);
      expect(setPaintProperty.mock.calls[0][2]).toEqual([
        'interpolate',
        ['linear'],
        ['get', 'floodVolume'],
        0,
        0.4,
        5,
        0.6,
        15,
        0.8,
      ]);
      expect(pending.size).toBe(0);
    }
  });

  it('stops by itself once the layer is gone', () => {
    const { map, setPaintProperty, removeLayer } = makeMap();
    animateFloodAppearing(map, 3000);
    removeLayer();
    vi.setSystemTime(100);
    runFrames();

    expect(setPaintProperty).toHaveBeenCalledTimes(1);
    expect(pending.size).toBe(0);
  });
});
