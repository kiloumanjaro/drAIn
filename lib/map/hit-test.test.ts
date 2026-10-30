import type mapboxgl from 'mapbox-gl';
import { describe, expect, it, vi } from 'vitest';
import {
  drainageHitLayers,
  hitsDrainageComponent,
  nearestFeature,
  pixelDistance,
  type HitFeature,
} from './hit-test';

/** Coordinates here are already pixels, so projecting is the identity. */
const project = ([x, y]: [number, number]) => ({ x, y });

const point = (name: string, at: [number, number], layer: string) => ({
  name,
  geometry: { type: 'Point', coordinates: at },
  layer: { id: layer },
});
const line = (name: string, through: [number, number][]) => ({
  name,
  geometry: { type: 'LineString', coordinates: through },
  layer: { id: 'man_pipes-hit-layer' },
});
const inlet = (name: string, at: [number, number]) =>
  point(name, at, 'inlets-hit-layer');

describe('pixelDistance', () => {
  it('measures to a point', () => {
    const geometry = { type: 'Point', coordinates: [3, 4] };
    expect(pixelDistance(geometry, { x: 0, y: 0 }, project)).toBe(5);
  });

  it('measures to the nearest stretch of a line, not its corners', () => {
    const geometry = {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [100, 0],
        [100, 100],
      ],
    };
    expect(pixelDistance(geometry, { x: 50, y: 7 }, project)).toBe(7);
    expect(pixelDistance(geometry, { x: 90, y: 50 }, project)).toBe(10);
  });

  it('measures to the end of a line when the point lies beyond it', () => {
    const geometry = {
      type: 'LineString',
      coordinates: [
        [0, 0],
        [100, 0],
      ],
    };
    expect(pixelDistance(geometry, { x: 103, y: 4 }, project)).toBe(5);
  });

  it('measures to the nearest part of a line in several parts', () => {
    const geometry = {
      type: 'MultiLineString',
      coordinates: [
        [
          [0, 0],
          [10, 0],
        ],
        [
          [0, 50],
          [10, 50],
        ],
      ],
    };
    expect(pixelDistance(geometry, { x: 5, y: 44 }, project)).toBe(6);
  });

  it('copes with a line of one point or two identical ones', () => {
    const one = { type: 'LineString', coordinates: [[3, 4]] };
    const same = {
      type: 'LineString',
      coordinates: [
        [3, 4],
        [3, 4],
      ],
    };
    expect(pixelDistance(one, { x: 0, y: 0 }, project)).toBe(5);
    expect(pixelDistance(same, { x: 0, y: 0 }, project)).toBe(5);
  });

  it('is infinite for a geometry with nothing to measure', () => {
    const at = { x: 0, y: 0 };
    expect(pixelDistance({ type: 'Point' }, at, project)).toBe(Infinity);
    expect(
      pixelDistance({ type: 'LineString', coordinates: [] }, at, project)
    ).toBe(Infinity);
    expect(pixelDistance({ type: 'GeometryCollection' }, at, project)).toBe(
      Infinity
    );
  });
});

describe('nearestFeature', () => {
  it('gives a click on the middle of a pipe to the pipe', () => {
    // The inlet's click target reaches the pipe's midpoint and it comes
    // first in the list: what used to win.
    const features = [
      inlet('inlet', [18, 0]),
      line('pipe', [
        [0, -100],
        [0, 100],
      ]),
    ];
    expect(nearestFeature(features, { x: 1, y: 0 }, project)?.name).toBe(
      'pipe'
    );
  });

  it('gives a click on an inlet to the inlet, though a pipe ends under it', () => {
    const features = [
      line('pipe', [
        [0, 0],
        [0, 100],
      ]),
      inlet('inlet', [0, 0]),
    ];
    // On the pipe's line exactly, and 4px off the inlet's centre: still
    // inside the inlet's drawn circle.
    expect(nearestFeature(features, { x: 0, y: 4 }, project)?.name).toBe(
      'inlet'
    );
  });

  it('gives the pipe back once the click is clear of the inlet', () => {
    const features = [
      inlet('inlet', [0, 0]),
      line('pipe', [
        [0, 0],
        [0, 100],
      ]),
    ];
    expect(nearestFeature(features, { x: 1, y: 15 }, project)?.name).toBe(
      'pipe'
    );
  });

  it('picks the nearer of two points', () => {
    const features = [inlet('far', [15, 0]), inlet('near', [-9, 0])];
    expect(nearestFeature(features, { x: 0, y: 0 }, project)?.name).toBe(
      'near'
    );
  });

  it('picks the nearer centre when the click is on two overlapping symbols', () => {
    const features = [inlet('left', [0, 0]), inlet('right', [6, 0])];
    expect(nearestFeature(features, { x: 4, y: 0 }, project)?.name).toBe(
      'right'
    );
  });

  it('keeps the order given, topmost first, when nothing separates them', () => {
    const features = [inlet('top', [5, 5]), inlet('under', [5, 5])];
    expect(nearestFeature(features, { x: 0, y: 0 }, project)?.name).toBe('top');
  });

  it('measures on the screen, through the projection it is given', () => {
    // Two degrees east is nearer on this screen than one degree north.
    const stretched = ([lng, lat]: [number, number]) => ({
      x: lng * 10,
      y: lat * 100,
    });
    const features = [inlet('north', [0, 1]), inlet('east', [2, 0])];
    expect(nearestFeature(features, { x: 0, y: 0 }, stretched)?.name).toBe(
      'east'
    );
  });

  it('falls back to the first feature when none can be measured', () => {
    const features: (HitFeature & { name: string })[] = [
      { name: 'first', geometry: { type: 'GeometryCollection' } },
      { name: 'second', geometry: { type: 'GeometryCollection' } },
    ];
    expect(nearestFeature(features, { x: 0, y: 0 }, project)?.name).toBe(
      'first'
    );
  });

  it('is null when the click landed on nothing', () => {
    expect(nearestFeature([], { x: 0, y: 0 }, project)).toBeNull();
  });
});

describe('drainage click targets', () => {
  const at = { x: 1, y: 1 } as mapboxgl.Point;
  const makeMap = (layers: string[], hits: unknown[]) => {
    const queryRenderedFeatures = vi.fn(() => hits);
    const map = {
      getLayer: (id: string) => (layers.includes(id) ? { id } : undefined),
      queryRenderedFeatures,
    } as unknown as mapboxgl.Map;
    return { map, queryRenderedFeatures };
  };

  it('lists only the layers the map has', () => {
    const { map } = makeMap(['inlets-hit-layer', 'inlets-layer'], []);
    expect(drainageHitLayers(map)).toEqual(['inlets-hit-layer']);
  });

  it('says a click on a component hits one', () => {
    const { map, queryRenderedFeatures } = makeMap(
      ['inlets-hit-layer', 'man_pipes-hit-layer'],
      [{}]
    );
    expect(hitsDrainageComponent(map, at)).toBe(true);
    expect(queryRenderedFeatures).toHaveBeenCalledWith(at, {
      layers: ['man_pipes-hit-layer', 'inlets-hit-layer'],
    });
  });

  it('says a click on open ground hits none', () => {
    const { map } = makeMap(['inlets-hit-layer'], []);
    expect(hitsDrainageComponent(map, at)).toBe(false);
  });

  it('does not ask the map before its layers exist', () => {
    // Mapbox throws when asked about a layer the style does not have.
    const { map, queryRenderedFeatures } = makeMap([], [{}]);
    expect(hitsDrainageComponent(map, at)).toBe(false);
    expect(queryRenderedFeatures).not.toHaveBeenCalled();
  });
});
