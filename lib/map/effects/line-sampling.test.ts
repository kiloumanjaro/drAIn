import { describe, expect, it } from 'vitest';

import {
  FLOOD_PULSE_AMOUNT,
  FLOOD_PULSE_SPEED_HZ,
  MIN_POINT_TO_NODE_DISTANCE_DEG,
  isPointTooCloseToNodes,
  samplePointsFromLine,
  wobbleFeatures,
} from './line-sampling';

function nodeAt(coordinates: [number, number]): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Point', coordinates },
  };
}

function lineFrom(
  coordinates: [number, number][],
  color = ''
): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: 'Feature',
    properties: { color },
    geometry: { type: 'LineString', coordinates },
  };
}

describe('isPointTooCloseToNodes', () => {
  const nodes = [nodeAt([120.0, 10.0])];

  it('rejects a point sitting on a node', () => {
    expect(isPointTooCloseToNodes([120.0, 10.0], nodes)).toBe(true);
  });

  it('accepts a point well clear of every node', () => {
    expect(isPointTooCloseToNodes([120.5, 10.5], nodes)).toBe(false);
  });

  it('uses the documented default distance', () => {
    const justInside: [number, number] = [
      120.0 + MIN_POINT_TO_NODE_DISTANCE_DEG / 2,
      10.0,
    ];
    expect(isPointTooCloseToNodes(justInside, nodes)).toBe(true);
  });

  it('accepts any point when there are no nodes', () => {
    expect(isPointTooCloseToNodes([120.0, 10.0], [])).toBe(false);
  });
});

describe('samplePointsFromLine', () => {
  it('returns nothing for a degenerate line', () => {
    expect(samplePointsFromLine(lineFrom([[120, 10]]))).toEqual([]);
  });

  it('emits points along a two-point line', () => {
    const points = samplePointsFromLine(
      lineFrom([
        [120, 10],
        [120.001, 10],
      ])
    );
    expect(points.length).toBeGreaterThan(0);
    for (const point of points) {
      expect(point.geometry.type).toBe('Point');
    }
  });

  it('samples a higher-risk line more densely', () => {
    const coordinates: [number, number][] = [
      [120, 10],
      [120.001, 10],
    ];
    const high = samplePointsFromLine(
      lineFrom(coordinates, 'rgb(211, 47, 47)')
    );
    const none = samplePointsFromLine(
      lineFrom(coordinates, 'rgb(56, 142, 60)')
    );
    expect(high.length).toBeGreaterThan(none.length);
  });
});

describe('wobbleFeatures', () => {
  const point = (
    coordinates: [number, number],
    properties: GeoJSON.GeoJsonProperties
  ): GeoJSON.Feature => ({
    type: 'Feature',
    properties,
    geometry: { type: 'Point', coordinates },
  });

  it('pulses and moves a point by its own phase, angle and distance', () => {
    // At t = 0 with a quarter-turn phase the wave is at its peak (sin = 1),
    // and an angle of 0 moves the point along the longitude only.
    const [feature] = wobbleFeatures(
      [
        point([120, 10], {
          phase: Math.PI / 2,
          offsetAngle: 0,
          offsetDistance: 0.0001,
          nodeId: 'I-1',
        }),
      ],
      0
    );
    expect(feature.properties?.pulseMultiplier).toBeCloseTo(
      1 - FLOOD_PULSE_AMOUNT / 2 + FLOOD_PULSE_AMOUNT,
      12
    );
    const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
    expect(lng).toBeCloseTo(120.0001, 12);
    expect(lat).toBeCloseTo(10, 12);
    expect(feature.properties?.nodeId).toBe('I-1');
  });

  it('gives the same frame for the same time', () => {
    const features = [
      point([120, 10], { phase: 1.2, offsetAngle: 0.7, offsetDistance: 5e-5 }),
      point([121, 11], { phase: 4, offsetAngle: 2, offsetDistance: 9e-5 }),
    ];
    expect(wobbleFeatures(features, 12.345)).toEqual(
      wobbleFeatures(features, 12.345)
    );
  });

  it('matches the formula the animation has always used', () => {
    const time = 7.25;
    const phase = 1.1;
    const offsetAngle = 2.3;
    const offsetDistance = 0.00007;
    const wave = Math.sin(time * FLOOD_PULSE_SPEED_HZ * Math.PI * 2 + phase);

    const [feature] = wobbleFeatures(
      [point([123.9, 10.3], { phase, offsetAngle, offsetDistance })],
      time
    );
    expect(feature.properties?.pulseMultiplier).toBe(
      1 - FLOOD_PULSE_AMOUNT / 2 + wave * FLOOD_PULSE_AMOUNT
    );
    expect((feature.geometry as GeoJSON.Point).coordinates).toEqual([
      123.9 + Math.cos(offsetAngle) * (wave * offsetDistance),
      10.3 + Math.sin(offsetAngle) * (wave * offsetDistance),
    ]);
  });

  it('repeats after one pulse period, whatever the frame rate', () => {
    const features = [
      point([120, 10], { phase: 0.4, offsetAngle: 1, offsetDistance: 8e-5 }),
    ];
    const period = 1 / FLOOD_PULSE_SPEED_HZ;
    const [a] = wobbleFeatures(features, 3);
    const [b] = wobbleFeatures(features, 3 + period);
    expect(b.properties?.pulseMultiplier).toBeCloseTo(
      a.properties?.pulseMultiplier,
      9
    );
  });

  it('keeps a point with no animation properties where it is', () => {
    const [feature] = wobbleFeatures([point([120, 10], null)], 5);
    expect((feature.geometry as GeoJSON.Point).coordinates).toEqual([120, 10]);
    expect(feature.properties?.pulseMultiplier).toBeTypeOf('number');
  });

  it('passes anything that is not a point through untouched', () => {
    const line = lineFrom([
      [120, 10],
      [120.001, 10],
    ]);
    const [feature] = wobbleFeatures([line], 5);
    expect(feature).toBe(line);
  });

  it('does not change the features it was given', () => {
    const original = point([120, 10], {
      phase: 1,
      offsetAngle: 1,
      offsetDistance: 9e-5,
    });
    const copy = structuredClone(original);
    const input = [original];
    const output = wobbleFeatures(input, 9.9);
    expect(original).toEqual(copy);
    expect(input).toHaveLength(1);
    expect(output[0]).not.toBe(original);
  });
});
