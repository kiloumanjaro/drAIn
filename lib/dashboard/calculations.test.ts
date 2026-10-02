import { describe, expect, it } from 'vitest';
import {
  calculateComponentTypePercentage,
  formatComponentType,
  formatDate,
  formatDateShort,
  formatDays,
  getPriorityBgColor,
  getPriorityColor,
  getStatusBadgeStyle,
} from './calculations';

describe('formatDays', () => {
  it('pluralises correctly around one day', () => {
    expect(formatDays(0)).toBe('0 days');
    expect(formatDays(1)).toBe('1 day');
    expect(formatDays(2)).toBe('2 days');
  });

  it('keeps fractional repair times readable', () => {
    expect(formatDays(1.5)).toBe('1.5 days');
    expect(formatDays(0.5)).toBe('0.5 days');
  });
});

describe('calculateComponentTypePercentage', () => {
  it('returns an empty list for no data', () => {
    expect(calculateComponentTypePercentage([])).toEqual([]);
  });

  it('gives a single component type the full 100%', () => {
    expect(
      calculateComponentTypePercentage([{ type: 'inlets', count: 7 }])
    ).toEqual([{ type: 'inlets', count: 7, percentage: 100 }]);
  });

  it('splits percentages across types and rounds them', () => {
    const result = calculateComponentTypePercentage([
      { type: 'inlets', count: 1 },
      { type: 'outlets', count: 2 },
    ]);
    expect(result).toEqual([
      { type: 'inlets', count: 1, percentage: 33 },
      { type: 'outlets', count: 2, percentage: 67 },
    ]);
  });

  it('shows 0% instead of dividing by zero when all counts are zero', () => {
    // A fresh deployment has no components yet; NaN% would leak into the UI.
    const result = calculateComponentTypePercentage([
      { type: 'inlets', count: 0 },
      { type: 'outlets', count: 0 },
    ]);
    expect(result.map((r) => r.percentage)).toEqual([0, 0]);
  });
});

describe('formatComponentType', () => {
  it('maps the database keys to display labels', () => {
    expect(formatComponentType('inlets')).toBe('Inlets');
    expect(formatComponentType('outlets')).toBe('Outlets');
    expect(formatComponentType('storm_drains')).toBe('Drains');
    expect(formatComponentType('man_pipes')).toBe('Pipes');
  });

  it('labels anything unexpected as Unknown', () => {
    expect(
      formatComponentType('rivers' as Parameters<typeof formatComponentType>[0])
    ).toBe('Unknown');
  });
});

describe('priority colours', () => {
  it('gives every priority level its own text colour', () => {
    expect(getPriorityColor('low')).toBe('text-gray-500');
    expect(getPriorityColor('medium')).toBe('text-yellow-600');
    expect(getPriorityColor('high')).toBe('text-orange-600');
    expect(getPriorityColor('critical')).toBe('text-red-600');
  });

  it('falls back to the low-priority colour for unknown values', () => {
    const bogus = 'urgent' as Parameters<typeof getPriorityColor>[0];
    expect(getPriorityColor(bogus)).toBe('text-gray-500');
    expect(getPriorityBgColor(bogus)).toBe('bg-gray-100');
  });

  it('pairs each priority with a matching background', () => {
    expect(getPriorityBgColor('critical')).toBe('bg-red-50');
    expect(getPriorityBgColor('medium')).toBe('bg-yellow-50');
  });
});

describe('getStatusBadgeStyle', () => {
  it('labels each workflow status for the badge', () => {
    expect(getStatusBadgeStyle('pending').label).toBe('Pending');
    expect(getStatusBadgeStyle('in-progress').label).toBe('In Progress');
    expect(getStatusBadgeStyle('resolved').label).toBe('Resolved');
  });

  it('treats an unknown status as pending rather than crashing', () => {
    const style = getStatusBadgeStyle(
      'archived' as Parameters<typeof getStatusBadgeStyle>[0]
    );
    expect(style.label).toBe('Pending');
  });
});

describe('date formatting', () => {
  // Built via the Date(y, m, d) constructor so the expected text does not
  // depend on the machine's time zone.
  const date = new Date(2026, 0, 15, 13, 5);

  it('shows date and time in the long format', () => {
    // ICU uses a narrow no-break space before AM/PM on newer Node versions.
    expect(formatDate(date)).toMatch(/^Jan 15, 2026, 01:05[  ]PM$/);
  });

  it('shows only the date in the short format', () => {
    expect(formatDateShort(date)).toBe('Jan 15, 2026');
  });

  it('accepts the same value as a Date or a string', () => {
    expect(formatDateShort(date.toISOString())).toBe(
      formatDateShort(new Date(date))
    );
  });
});
