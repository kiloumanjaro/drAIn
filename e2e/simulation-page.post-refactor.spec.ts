import { test, expect } from '@playwright/test';
import {
  parseNodeId,
  isPointTooCloseToNodes,
  samplePointsFromLine,
  REFERENCE_SEGMENT_LENGTH_DEG,
  MIN_POINT_TO_NODE_DISTANCE_DEG,
  FLOOD_PULSE_AMOUNT,
  FLOOD_PULSE_SPEED_HZ,
  CAMERA_FLY_DURATION_MS,
  FLOOD_PROPAGATION_MAX_RETRIES,
  VULNERABILITY_SAMPLE_MULTIPLIER,
} from '../app/(main)/simulation/page.helpers';
import {
  HAZARD_BANDS,
  HAZARD_FALLBACK_COLORS,
  getColorForCategory,
  getStrokeColorForCategory,
  hazardBandFromColor,
} from '../lib/simulation-api/hazard-band';

// Post-refactor: verify the new `page.helpers.ts` module exposes the
// promised pure helpers and constants with the same behaviour the inline
// definitions had before extraction.
test.describe('simulation/page.helpers extracted module', () => {
  test('HAZARD_BANDS preserves the original palette', () => {
    expect(HAZARD_BANDS.high.fill).toBe('#D32F2F');
    expect(HAZARD_BANDS.medium.fill).toBe('#FFA000');
    expect(HAZARD_BANDS.low.fill).toBe('#FFF176');
    expect(HAZARD_BANDS.none.fill).toBe('#388E3C');
    expect(HAZARD_FALLBACK_COLORS.fill).toBe('#5687ca');
    expect(HAZARD_BANDS.high.stroke).toBe('#8B0000');
    expect(HAZARD_BANDS.medium.stroke).toBe('#B36200');
    expect(HAZARD_BANDS.low.stroke).toBe('#C4B000');
    expect(HAZARD_BANDS.none.stroke).toBe('#1B5E20');
    expect(HAZARD_FALLBACK_COLORS.stroke).toBe('#00346c');
  });

  test('magic-number constants match the original literals', () => {
    expect(REFERENCE_SEGMENT_LENGTH_DEG).toBe(0.0005);
    expect(MIN_POINT_TO_NODE_DISTANCE_DEG).toBe(0.00008);
    expect(FLOOD_PULSE_AMOUNT).toBe(0.35);
    expect(FLOOD_PULSE_SPEED_HZ).toBe(0.3);
    expect(CAMERA_FLY_DURATION_MS).toBe(1500);
    expect(FLOOD_PROPAGATION_MAX_RETRIES).toBe(10);
    expect(VULNERABILITY_SAMPLE_MULTIPLIER).toEqual({
      high: 3,
      medium: 2,
      low: 1.5,
      none: 1,
    });
  });

  test('getColorForCategory branches on substring + fallback', () => {
    expect(getColorForCategory('High Risk')).toBe('#D32F2F');
    expect(getColorForCategory('Medium Risk')).toBe('#FFA000');
    expect(getColorForCategory('low risk')).toBe('#FFF176');
    expect(getColorForCategory('No Risk')).toBe('#388E3C');
    // Use an input that contains none of the substrings ("high", "medium",
    // "low", "no"). Original behaviour: anything matching "no" falls into
    // the green/none bucket, which is intentional.
    expect(getColorForCategory('xyz')).toBe('#5687ca');
  });

  test('getStrokeColorForCategory branches on substring + fallback', () => {
    expect(getStrokeColorForCategory('high risk')).toBe('#8B0000');
    expect(getStrokeColorForCategory('Medium Risk')).toBe('#B36200');
    expect(getStrokeColorForCategory('low')).toBe('#C4B000');
    expect(getStrokeColorForCategory('no risk')).toBe('#1B5E20');
    expect(getStrokeColorForCategory('xyz')).toBe('#00346c');
  });

  test('hazardBandFromColor reads palette + rgb(); null for a non-colour', () => {
    expect(hazardBandFromColor('rgb(211, 47, 47)')?.level).toBe('high');
    expect(hazardBandFromColor('rgb(255, 160, 0)')?.level).toBe('medium');
    expect(hazardBandFromColor('rgb(255, 235, 100)')?.level).toBe('low');
    expect(hazardBandFromColor('rgb(56, 142, 60)')?.level).toBe('none');
    expect(hazardBandFromColor('rgb(220, 50, 50)')?.level).toBe('high');
    expect(hazardBandFromColor('rgb(220, 220, 50)')?.level).toBe('low');
    expect(hazardBandFromColor('not-a-color')).toBeNull();
  });

  test('parseNodeId routes ISD-* to storm_drains and I-* to inlets', () => {
    expect(parseNodeId('ISD-12')).toEqual({
      source: 'storm_drains',
      featureId: 'ISD-12',
    });
    expect(parseNodeId('I-4')).toEqual({ source: 'inlets', featureId: 'I-4' });
    expect(parseNodeId('whatever')).toEqual({
      source: null,
      featureId: null,
    });
  });

  test('isPointTooCloseToNodes uses Euclidean distance in degrees', () => {
    const node: GeoJSON.Feature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [10, 10] },
    };
    expect(isPointTooCloseToNodes([10, 10], [node])).toBe(true);
    expect(isPointTooCloseToNodes([10.001, 10], [node])).toBe(false);
    expect(isPointTooCloseToNodes([10, 10], [])).toBe(false);
  });

  test('samplePointsFromLine returns [] for degenerate lines and emits points otherwise', () => {
    expect(
      samplePointsFromLine({
        type: 'Feature',
        properties: { color: 'rgb(211, 47, 47)' },
        geometry: { type: 'LineString', coordinates: [[0, 0]] },
      })
    ).toEqual([]);

    const out = samplePointsFromLine({
      type: 'Feature',
      properties: { color: 'rgb(211, 47, 47)', floodVolume: 5, pipeName: 'P1' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [0, 0],
          [0.01, 0],
        ],
      },
    });
    expect(out.length).toBeGreaterThan(0);
    for (const f of out) {
      expect(f.type).toBe('Feature');
      expect((f.geometry as GeoJSON.Point).type).toBe('Point');
      expect(f.properties?.vulnerability).toBe('High Risk');
      expect(f.properties?.pipeName).toBe('P1');
    }
  });
});
