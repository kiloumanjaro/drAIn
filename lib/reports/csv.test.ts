import { describe, expect, it } from 'vitest';
import { csvField, monthRangeUtc, parseMonthYear } from './csv';

describe('csvField', () => {
  it('leaves plain text and numbers alone', () => {
    expect(csvField('Blocked inlet')).toBe('Blocked inlet');
    expect(csvField(10.36)).toBe('10.36');
    expect(csvField(-12.5)).toBe('-12.5');
    expect(csvField(null)).toBe('');
  });

  it('quotes commas, quotes and line breaks', () => {
    expect(csvField('a, b')).toBe('"a, b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField('two\nlines')).toBe('"two\nlines"');
  });

  it('stops citizen text from running as a spreadsheet formula', () => {
    expect(csvField('=HYPERLINK("http://x","click")')).toBe(
      '"\'=HYPERLINK(""http://x"",""click"")"'
    );
    expect(csvField('+cmd')).toBe("'+cmd");
    expect(csvField('-2+3')).toBe("'-2+3");
    expect(csvField('@SUM(A1)')).toBe("'@SUM(A1)");
  });
});

describe('parseMonthYear', () => {
  it('accepts a real month and a four-digit year', () => {
    expect(parseMonthYear('9', '2026')).toEqual({ month: 9, year: 2026 });
    expect(parseMonthYear('12', '2025')).toEqual({ month: 12, year: 2025 });
  });

  it('refuses anything else', () => {
    expect(parseMonthYear('13', '2026')).toBeNull();
    expect(parseMonthYear('0', '2026')).toBeNull();
    expect(parseMonthYear('abc', '2026')).toBeNull();
    expect(parseMonthYear('9', '2026"; x=1')).toBeNull();
    expect(parseMonthYear(null, '2026')).toBeNull();
  });
});

describe('monthRangeUtc', () => {
  it('starts and ends a month on Manila midnights, expressed in UTC', () => {
    const { start, end } = monthRangeUtc(10, 2026);
    expect(start.toISOString()).toBe('2026-09-30T16:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-31T16:00:00.000Z');
  });

  it('rolls over the year for December', () => {
    const { start, end } = monthRangeUtc(12, 2026);
    expect(start.toISOString()).toBe('2026-11-30T16:00:00.000Z');
    expect(end.toISOString()).toBe('2026-12-31T16:00:00.000Z');
  });

  it('keeps a report from the first Manila hours of a month in that month', () => {
    // Filed 2026-10-01 00:30 in Mandaue, stored as 2026-09-30T16:30Z. A
    // server-local range on a UTC host put it in September.
    const filed = new Date('2026-09-30T16:30:00Z');
    const october = monthRangeUtc(10, 2026);
    const september = monthRangeUtc(9, 2026);
    expect(filed >= october.start && filed < october.end).toBe(true);
    expect(filed >= september.start && filed < september.end).toBe(false);
  });
});
