import { describe, expect, it } from 'vitest';
import {
  formatComponentType,
  formatDate,
  formatDateShort,
  formatDays,
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
