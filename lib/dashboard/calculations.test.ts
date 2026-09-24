import { describe, expect, it } from 'vitest';

import { calculateRepairDays, groupRepairDataByDate } from './calculations';

describe('calculateRepairDays', () => {
  it('measures days to one decimal place', () => {
    expect(
      calculateRepairDays('2026-01-01T00:00:00Z', '2026-01-04T12:00:00Z')
    ).toBe(3.5);
  });

  it('returns null when the work predates the report', () => {
    expect(
      calculateRepairDays('2026-01-04T00:00:00Z', '2026-01-01T00:00:00Z')
    ).toBeNull();
  });

  it.each([
    ['the report date', 'not a date', '2026-01-04T00:00:00Z'],
    ['the cleaning date', '2026-01-01T00:00:00Z', 'not a date'],
  ])('returns null when %s is unparseable', (_case, created, cleaned) => {
    // It used to return NaN, which then poisoned every average it was
    // summed into.
    expect(calculateRepairDays(created, cleaned)).toBeNull();
  });
});

describe('groupRepairDataByDate', () => {
  const report = (overrides = {}) => ({
    created_at: '2026-01-01T00:00:00Z',
    component_id: 'I-4',
    last_cleaned_at: '2026-01-03T00:00:00Z',
    ...overrides,
  });

  it('averages the repairs closed on a day', () => {
    const [day] = groupRepairDataByDate([
      report(),
      report({ last_cleaned_at: '2026-01-05T00:00:00Z' }),
    ]);
    expect(day.count).toBe(2);
    expect(day.averageDays).toBe(3);
  });

  it('skips reports that were never cleaned', () => {
    expect(
      groupRepairDataByDate([report({ last_cleaned_at: undefined })])
    ).toEqual([]);
  });

  it('skips a row whose dates are impossible rather than skewing the day', () => {
    const [day] = groupRepairDataByDate([
      report(),
      report({ last_cleaned_at: '2025-01-01T00:00:00Z' }),
    ]);
    expect(day.count).toBe(1);
    expect(day.averageDays).toBe(2);
  });

  it('survives a malformed report date', () => {
    // new Date('nope').toISOString() throws, so one bad row used to take
    // the whole chart down.
    expect(() =>
      groupRepairDataByDate([report({ created_at: 'nope' })])
    ).not.toThrow();
  });

  it('orders days oldest first', () => {
    const days = groupRepairDataByDate([
      report({
        created_at: '2026-02-01T00:00:00Z',
        last_cleaned_at: '2026-02-02T00:00:00Z',
      }),
      report(),
    ]);
    expect(days.map((d) => d.date)).toEqual(['2026-01-01', '2026-02-01']);
  });
});
