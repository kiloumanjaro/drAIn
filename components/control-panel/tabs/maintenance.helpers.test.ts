import { describe, expect, it } from 'vitest';

import {
  MAINTENANCE_PHOTO_MAX_AGE_HOURS,
  MAINTENANCE_PHOTO_MAX_DISTANCE_M,
  getStatusStyles,
  validateMaintenancePhoto,
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

describe('validateMaintenancePhoto', () => {
  it('accepts a recent photo taken at the asset', () => {
    expect(
      validateMaintenancePhoto(validPhoto(), [ASSET], flatDistanceM, NOW)
    ).toBeNull();
  });

  it('rejects a photo with no EXIF date', () => {
    const error = validateMaintenancePhoto(
      validPhoto({ date: null }),
      [ASSET],
      flatDistanceM,
      NOW
    );
    expect(error).toMatch(/date/i);
  });

  it('rejects a photo older than the limit', () => {
    const error = validateMaintenancePhoto(
      validPhoto({ date: hoursAgo(MAINTENANCE_PHOTO_MAX_AGE_HOURS + 1) }),
      [ASSET],
      flatDistanceM,
      NOW
    );
    expect(error).toMatch(/too old/i);
  });

  it('accepts a photo exactly at the age limit', () => {
    expect(
      validateMaintenancePhoto(
        validPhoto({ date: hoursAgo(MAINTENANCE_PHOTO_MAX_AGE_HOURS) }),
        [ASSET],
        flatDistanceM,
        NOW
      )
    ).toBeNull();
  });

  it('quotes the configured limit rather than a hardcoded number', () => {
    const error = validateMaintenancePhoto(
      validPhoto({ date: hoursAgo(99) }),
      [ASSET],
      flatDistanceM,
      NOW
    );
    expect(error).toContain(String(MAINTENANCE_PHOTO_MAX_AGE_HOURS));
  });

  it('rejects a photo dated in the future', () => {
    const error = validateMaintenancePhoto(
      validPhoto({ date: hoursAgo(-2) }),
      [ASSET],
      flatDistanceM,
      NOW
    );
    expect(error).toMatch(/future/i);
  });

  it.each([
    ['latitude', { latitude: null }],
    ['longitude', { longitude: null }],
  ])('rejects a photo with no %s', (_field, overrides) => {
    const error = validateMaintenancePhoto(
      validPhoto(overrides),
      [ASSET],
      flatDistanceM,
      NOW
    );
    expect(error).toMatch(/coordinates/i);
  });

  it('rejects a photo when the asset has no location', () => {
    const error = validateMaintenancePhoto(
      validPhoto(),
      [],
      flatDistanceM,
      NOW
    );
    expect(error).toMatch(/asset location/i);
  });

  it('rejects a photo taken beyond the radius', () => {
    const error = validateMaintenancePhoto(
      validPhoto({ longitude: 124.05 }),
      [ASSET],
      flatDistanceM,
      NOW
    );
    expect(error).toMatch(/too far/i);
    expect(error).toContain(String(MAINTENANCE_PHOTO_MAX_DISTANCE_M));
  });

  it('accepts a photo near any point of a pipe, not just its first', () => {
    // Photo sits at the far end of the run; the first point is well away.
    const pipe: [number, number][] = [
      [123.95, 10.32],
      [123.96, 10.32],
      [123.97, 10.32],
    ];
    expect(
      validateMaintenancePhoto(
        validPhoto({ longitude: 123.97, latitude: 10.32 }),
        pipe,
        flatDistanceM,
        NOW
      )
    ).toBeNull();
  });

  it('reports the distance to the nearest point of a pipe', () => {
    const pipe: [number, number][] = [
      [123.95, 10.32],
      [124.5, 10.32],
    ];
    const error = validateMaintenancePhoto(
      validPhoto({ longitude: 123.99, latitude: 10.32 }),
      pipe,
      flatDistanceM,
      NOW
    );
    // Nearest is 0.04 deg away (4000 m), not the 51000 m to the far end.
    expect(error).toContain('4000m');
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
