import { describe, expect, it } from 'vitest';

import {
  boundsOf,
  mergeRuns,
  slimFeature,
  tileOf,
  tilesInBounds,
} from './flood-tiles-lib.mjs';

type Ring = [number, number][];
type Feature = {
  type: 'Feature';
  properties: { Var: number | null };
  geometry: { type: 'Polygon'; coordinates: Ring[] };
};

/** A 10 m-ish grid cell: column `col`, row `row`, as the exporter writes it. */
function cell(col: number, row: number, Var: number, jitter = 0): Feature {
  const step = 0.00009;
  const x0 = 123.9 + col * step;
  const x1 = x0 + step;
  const y0 = 10.3 + row * step;
  const y1 = y0 + step;
  return {
    type: 'Feature',
    properties: { Var },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [x0, y0],
          [x0, y1 + jitter],
          [x1 + jitter, y1],
          [x1, y0],
          [x0, y0],
        ],
      ],
    },
  };
}

function widths(features: Feature[]) {
  return features
    .map((f) => {
      const xs = f.geometry.coordinates[0].map((p) => p[0]);
      return Math.round((Math.max(...xs) - Math.min(...xs)) / 0.00009);
    })
    .sort();
}

describe('slimFeature', () => {
  it('keeps only Var and six decimals', () => {
    const slim = slimFeature({
      type: 'Feature',
      properties: { Var: 2, OBJECTID: 7, Shape_Area: 100 },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [123.91729612345678, 10.30618912345678],
            [123.9172961, 10.3062791],
            [123.9172051, 10.3062801],
            [123.9172041, 10.3061891],
            [123.91729612345678, 10.30618912345678],
          ],
        ],
      },
    });
    expect(slim?.properties).toEqual({ Var: 2 });
    expect(slim?.geometry.coordinates[0][0]).toEqual([123.917296, 10.306189]);
  });

  it('drops a ring that collapses on rounding', () => {
    const tiny = (d: number): Ring => [
      [123.9, 10.3],
      [123.9 + d, 10.3],
      [123.9 + d, 10.3 + d],
      [123.9, 10.3],
    ];
    expect(
      slimFeature({
        type: 'Feature',
        properties: { Var: 1 },
        geometry: { type: 'Polygon', coordinates: [tiny(1e-8)] },
      })
    ).toBeNull();
  });

  it('refuses anything but a Polygon', () => {
    expect(() =>
      slimFeature({
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: [0, 0] },
      })
    ).toThrow(/Polygon/);
  });
});

describe('mergeRuns', () => {
  it('merges a 3x2 grid with two Var values into the expected rectangles', () => {
    // Row 0: Var 2, 2, 3. Row 1: Var 3, 3, 3.
    const grid = [
      cell(0, 0, 2),
      cell(1, 0, 2),
      cell(2, 0, 3),
      cell(0, 1, 3),
      cell(1, 1, 3),
      cell(2, 1, 3),
    ].map((f) => slimFeature(f)!);
    const merged = mergeRuns(grid) as Feature[];
    expect(merged).toHaveLength(3);
    expect(widths(merged)).toEqual([1, 2, 3]);
    const byVar = merged.map((f) => f.properties.Var).sort();
    expect(byVar).toEqual([2, 3, 3]);
  });

  it('merges cells whose shared edge differs by a millionth of a degree', () => {
    const grid = [cell(0, 0, 1), cell(1, 0, 1, 0.000001)].map(
      (f) => slimFeature(f)!
    );
    expect(mergeRuns(grid)).toHaveLength(1);
  });

  it('does not merge across a gap', () => {
    const grid = [cell(0, 0, 1), cell(2, 0, 1)].map((f) => slimFeature(f)!);
    expect(mergeRuns(grid)).toHaveLength(2);
  });

  it('passes a non-rectangle polygon through untouched', () => {
    const triangle: Feature = {
      type: 'Feature',
      properties: { Var: 1 },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [123.9, 10.3],
            [123.901, 10.3],
            [123.9005, 10.301],
            [123.9, 10.3],
          ],
        ],
      },
    };
    const merged = mergeRuns([triangle, slimFeature(cell(0, 0, 1))!]);
    expect(merged).toHaveLength(2);
    expect(merged).toContainEqual(triangle);
  });
});

describe('tiles', () => {
  it('finds the tile of a known point', () => {
    // Mandaue City at zoom 10: 2^10 * (123.93 + 180) / 360 = 864.6.
    expect(tileOf(123.93, 10.33, 10)).toEqual({ x: 864, y: 482 });
  });

  it('lists every tile that touches a small bbox from z10 to z14', () => {
    const bounds = boundsOf([slimFeature(cell(0, 0, 1))!]);
    const tiles = tilesInBounds(
      bounds as [number, number, number, number],
      10,
      14
    );
    expect(tiles).toHaveLength(5);
    expect(tiles[0]).toEqual({ z: 10, ...tileOf(bounds[0], bounds[3], 10) });
    expect(tiles[4].z).toBe(14);
  });
});
