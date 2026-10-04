import { describe, expect, it } from 'vitest';

import {
  findNodeCoordinates,
  FLOOD_PULSE_AMOUNT,
  FLOOD_PULSE_SPEED_HZ,
  MIN_POINT_TO_NODE_DISTANCE_DEG,
  getColorForCategory,
  getStrokeColorForCategory,
  getVulnerabilityFromColor,
  isPointTooCloseToNodes,
  parseNodeId,
  samplePointsFromLine,
  wobbleFeatures,
} from './page.helpers';

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

describe('vulnerability colours', () => {
  it.each([
    ['High Risk', 'high'],
    ['HIGH', 'high'],
    ['  medium  ', 'medium'],
    ['Low Risk', 'low'],
    ['No risk', 'none'],
  ])('maps %s consistently across fill and stroke', (category) => {
    // Both lookups must land in the same bucket, or a node would be filled
    // as one category and outlined as another.
    expect(getColorForCategory(category)).not.toBe(
      getColorForCategory('unrecognised')
    );
    expect(getStrokeColorForCategory(category)).not.toBe(
      getStrokeColorForCategory('unrecognised')
    );
  });

  it('falls back for an unknown category', () => {
    expect(getColorForCategory('')).toBe(getColorForCategory('something else'));
  });

  it('distinguishes every known category', () => {
    const colors = ['high', 'medium', 'low', 'no'].map(getColorForCategory);
    expect(new Set(colors).size).toBe(4);
  });
});

describe('getVulnerabilityFromColor', () => {
  it.each([
    ['rgb(211, 47, 47)', 'High Risk'],
    ['rgb(255, 160, 0)', 'Medium Risk'],
    ['rgb(255, 235, 100)', 'Low Risk'],
    ['rgb(56, 142, 60)', 'No Risk'],
  ])('recognises the exact palette colour %s', (color, expected) => {
    expect(getVulnerabilityFromColor(color)).toBe(expected);
  });

  it('classifies an interpolated red as high risk', () => {
    expect(getVulnerabilityFromColor('rgb(230, 60, 40)')).toBe('High Risk');
  });

  it('classifies an interpolated yellow as low risk', () => {
    expect(getVulnerabilityFromColor('rgb(250, 240, 120)')).toBe('Low Risk');
  });

  it('falls back to medium risk for an unparseable colour', () => {
    expect(getVulnerabilityFromColor('not a colour')).toBe('Medium Risk');
  });
});

describe('parseNodeId', () => {
  it('routes ISD- ids to storm drains', () => {
    expect(parseNodeId('ISD-12')).toEqual({
      source: 'storm_drains',
      featureId: 'ISD-12',
    });
  });

  it('routes I- ids to inlets', () => {
    expect(parseNodeId('I-4')).toEqual({ source: 'inlets', featureId: 'I-4' });
  });

  it('checks the ISD- prefix before I-, which it also starts with', () => {
    expect(parseNodeId('ISD-1').source).toBe('storm_drains');
  });

  it('returns nothing for an unrecognised id', () => {
    expect(parseNodeId('X-9')).toEqual({ source: null, featureId: null });
  });
});

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

describe('findNodeCoordinates', () => {
  const inlets = [
    { id: 'I-1', coordinates: [123.9, 10.3] as [number, number] },
  ];
  const drains = [
    { id: 'ISD-1', coordinates: [123.8, 10.2] as [number, number] },
  ];

  it('finds an inlet among the inlets and a drain among the drains', () => {
    expect(findNodeCoordinates('inlets', 'I-1', inlets, drains)).toEqual([
      123.9, 10.3,
    ]);
    expect(
      findNodeCoordinates('storm_drains', 'ISD-1', inlets, drains)
    ).toEqual([123.8, 10.2]);
  });

  it('looks only in the source it was given', () => {
    expect(findNodeCoordinates('storm_drains', 'I-1', inlets, drains)).toBe(
      null
    );
  });

  it('gives null for an unknown node or source', () => {
    expect(findNodeCoordinates('inlets', 'I-404', inlets, drains)).toBe(null);
    expect(findNodeCoordinates('outlets', 'I-1', inlets, drains)).toBe(null);
  });
});
