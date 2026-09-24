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

  it('does not reorder its input', () => {
    const values = [5, 1, 3];
    median(values);
    expect(values).toEqual([5, 1, 3]);
  });
});

describe('maintenance date lookup', () => {
  const index = indexMaintenanceDates([
    {
      table: 'inlets_maintenance',
      rows: [{ id: 1, last_cleaned_at: '2026-01-02T00:00:00Z' }],
    },
    {
      table: 'outlets_maintenance',
      rows: [
        { id: 1, last_cleaned_at: '2026-03-09T00:00:00Z' },
        { id: 2, last_cleaned_at: '2026-03-10T00:00:00Z' },
      ],
    },
  ]);

  it('finds the record in the table the report names', () => {
    // Each maintenance table numbers its own rows, so id 1 exists in both.
    // Keyed by id alone, the last table read won and the inlet report
    // was measured against the outlet's date.
    expect(lookupMaintenanceDate(index, '1', 'inlets_maintenance')).toBe(
      '2026-01-02T00:00:00Z'
    );
    expect(lookupMaintenanceDate(index, 1, 'outlets_maintenance')).toBe(
      '2026-03-09T00:00:00Z'
    );
  });

  it('falls back to the id alone when the report names no table', () => {
    expect(lookupMaintenanceDate(index, '2', null)).toBe(
      '2026-03-10T00:00:00Z'
    );
  });

  it('refuses to guess when the id alone is ambiguous', () => {
    expect(lookupMaintenanceDate(index, '1', null)).toBeNull();
  });

  it('returns null for no id or an unknown one', () => {
    expect(lookupMaintenanceDate(index, null, 'inlets_maintenance')).toBeNull();
    expect(lookupMaintenanceDate(index, '9', 'inlets_maintenance')).toBeNull();
  });
});
