import { describe, expect, it } from 'vitest';

import {
  MIN_POINT_TO_NODE_DISTANCE_DEG,
  getColorForCategory,
  getStrokeColorForCategory,
  getVulnerabilityFromColor,
  isPointTooCloseToNodes,
  parseNodeId,
  samplePointsFromLine,
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
