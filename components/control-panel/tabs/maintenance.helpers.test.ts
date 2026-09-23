import { describe, expect, it } from 'vitest';

import {
  MAINTENANCE_PHOTO_MAX_AGE_HOURS,
  MAINTENANCE_PHOTO_MAX_DISTANCE_M,
  checkMaintenancePhoto,
  getStatusStyles,
  unverifiedNote,
} from './maintenance.helpers';

const NOW = new Date('2026-01-15T12:00:00Z');
const ASSET: [number, number] = [123.95, 10.32];

/** Stand-in for turf: a flat metric so distances in tests are exact. */
const flatDistanceM = (from: [number, number], to: [number, number]): number =>
  Math.hypot(from[0] - to[0], from[1] - to[1]) * 100_000;

function hoursAgo(hours: number): Date {
  return new Date(NOW.getTime() - hours * 60 * 60 * 1000);
}

function validPhoto(overrides = {}) {
  return {
    date: hoursAgo(1),
    latitude: 10.32,
    longitude: 123.95,
    ...overrides,
  };
}

describe('checkMaintenancePhoto', () => {
  const check = (overrides = {}, coords = [ASSET]) =>
    checkMaintenancePhoto(
      validPhoto(overrides),
      coords as [number, number][],
      flatDistanceM,
      NOW
    );

  describe('a photo it can check', () => {
    it('passes one taken recently at the asset', () => {
      expect(check().outcome).toBe('verified');
    });

    it('passes one exactly at the age limit', () => {
      expect(
        check({ date: hoursAgo(MAINTENANCE_PHOTO_MAX_AGE_HOURS) }).outcome
      ).toBe('verified');
    });

    it('accepts one near any point of a pipe, not just its first', () => {
      const pipe: [number, number][] = [
        [123.95, 10.32],
        [123.96, 10.32],
        [123.97, 10.32],
      ];
      expect(check({ longitude: 123.97, latitude: 10.32 }, pipe).outcome).toBe(
        'verified'
      );
    });
  });

  describe('a photo whose own metadata contradicts the claim', () => {
    it('rejects one that is too old', () => {
      const result = check({
        date: hoursAgo(MAINTENANCE_PHOTO_MAX_AGE_HOURS + 1),
      });
      expect(result.outcome).toBe('rejected');
      expect(result.reason).toMatch(/hours/i);
    });

    it('rejects one dated in the future', () => {
      const result = check({ date: hoursAgo(-2) });
      expect(result.outcome).toBe('rejected');
      expect(result.reason).toMatch(/future/i);
    });

    it('rejects one taken beyond the radius', () => {
      const result = check({ longitude: 124.05 });
      expect(result.outcome).toBe('rejected');
      expect(result.reason).toContain(String(MAINTENANCE_PHOTO_MAX_DISTANCE_M));
    });

    it('reports the distance to the nearest point of a pipe', () => {
      const pipe: [number, number][] = [
        [123.95, 10.32],
        [124.5, 10.32],
      ];
      const result = check({ longitude: 123.99, latitude: 10.32 }, pipe);
      // Nearest is 4000 m away, not the 51000 m to the far end.
      expect(result.reason).toContain('4000');
    });
  });

  describe('a photo it cannot check', () => {
    // These used to be rejections, which blocked cooperative users while
    // stopping nobody determined to fake a submission.
    it('accepts one with no timestamp, marked unverified', () => {
      const result = check({ date: null });
      expect(result.outcome).toBe('unverifiable');
      expect(result.reason).toMatch(/timestamp/i);
    });

    it.each([
      ['latitude', { latitude: null }],
      ['longitude', { longitude: null }],
    ])('accepts one with no %s, marked unverified', (_field, overrides) => {
      expect(check(overrides).outcome).toBe('unverifiable');
    });

    it('accepts one when the asset itself has no location', () => {
      // Our data gap, not the submitter's.
      expect(check({}, []).outcome).toBe('unverifiable');
    });

    it('still rejects an old photo even when it has no location', () => {
      // Evidence of a problem outranks absence of evidence.
      expect(
        check({ date: hoursAgo(99), latitude: null, longitude: null }).outcome
      ).toBe('rejected');
    });

    it('gives a reason a submitter can act on', () => {
      expect(check({ date: null }).reason).toMatch(/submitted and marked/i);
    });
  });
});

describe('unverifiedNote', () => {
  it('marks the record so a reviewer can tell them apart', () => {
    expect(unverifiedNote('no timestamp')).toContain('unverified');
    expect(unverifiedNote('no timestamp')).toContain('no timestamp');
  });
});

describe('getStatusStyles', () => {
  it('gives resolved rows a distinct style', () => {
    expect(getStatusStyles('resolved')).not.toBe(
      getStatusStyles('in-progress')
    );
  });

  it('falls back for an unknown or missing status', () => {
    expect(getStatusStyles(null)).toBe(getStatusStyles('something-else'));
  });
});
