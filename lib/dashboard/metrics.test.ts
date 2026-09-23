import { describe, expect, it } from 'vitest';

import { daysBetween, median } from './metrics';

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
