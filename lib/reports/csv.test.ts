import { describe, expect, it } from 'vitest';
import { csvField, parseMonthYear } from './csv';

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
