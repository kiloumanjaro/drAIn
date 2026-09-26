import { describe, expect, it } from 'vitest';

import {
  daysBetween,
  indexMaintenanceDates,
  lookupMaintenanceDate,
  median,
} from './metrics';

describe('daysBetween', () => {
  it('measures whole days', () => {
    expect(daysBetween('2026-01-01T00:00:00Z', '2026-01-04T00:00:00Z')).toBe(3);
  });

  it('measures part days', () => {
    expect(daysBetween('2026-01-01T00:00:00Z', '2026-01-01T12:00:00Z')).toBe(
      0.5
    );
  });

  it.each([
    ['a missing start', null, '2026-01-04T00:00:00Z'],
    ['a missing end', '2026-01-01T00:00:00Z', null],
    ['an unparseable date', 'not a date', '2026-01-04T00:00:00Z'],
  ])('returns null for %s', (_case, from, to) => {
    expect(daysBetween(from, to)).toBeNull();
  });

  it('returns null when the work predates the report', () => {
    // A negative duration means the link is wrong, not that it was fixed
    // before it was reported. Counting it would drag the median down.
    expect(
      daysBetween('2026-01-04T00:00:00Z', '2026-01-01T00:00:00Z')
    ).toBeNull();
  });

  it('counts a same-instant resolution as zero, not null', () => {
    expect(daysBetween('2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')).toBe(0);
  });
});

describe('median', () => {
  it('takes the middle of an odd-length set', () => {
    expect(median([5, 1, 3])).toBe(3);
  });

  it('averages the middle pair of an even-length set', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('is unmoved by a single extreme value', () => {
    // The reason this is not a mean: one report left open for a year
    // should not swamp fifty closed the next day.
    expect(median([1, 1, 1, 1, 365])).toBe(1);
  });

  it('returns null when there is nothing to measure', () => {
    expect(median([])).toBeNull();
  });

  it('leaves out values that are not numbers', () => {
    // NaN makes the sort comparator return NaN, which leaves the order, and
    // so the middle value, up to the engine.
    expect(median([NaN, 5, 1, NaN, 3])).toBe(3);
    expect(median([Infinity, 2, 4])).toBe(3);
  });

  it('returns null when nothing in the set is a number', () => {
    expect(median([NaN, NaN])).toBeNull();
  });

  it('does not reorder its input', () => {
    const values = [5, 1, 3];
    median(values);
    expect(values).toEqual([5, 1, 3]);
  });
});

describe('maintenance date lookup', () => {
  const index = indexMaintenanceDates([
    { id: 'm1', performed_at: '2026-01-02T00:00:00Z' },
    { id: 'm2', performed_at: '2026-03-10T00:00:00Z' },
    { id: null, performed_at: '2026-04-01T00:00:00Z' },
  ]);

  it('finds a record by its id', () => {
    expect(lookupMaintenanceDate(index, 'm1')).toBe('2026-01-02T00:00:00Z');
    expect(lookupMaintenanceDate(index, 'm2')).toBe('2026-03-10T00:00:00Z');
  });

  it('returns null for no id or an unknown one', () => {
    expect(lookupMaintenanceDate(index, null)).toBeNull();
    expect(lookupMaintenanceDate(index, undefined)).toBeNull();
    expect(lookupMaintenanceDate(index, 'm9')).toBeNull();
  });

  it('skips rows without an id', () => {
    expect(index.size).toBe(2);
  });
});
