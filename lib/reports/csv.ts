/**
 * The staff CSV export (app/api/reports/download). Staff open it in Excel or
 * Sheets, and the text in it comes from citizens.
 */

/** Characters that make a spreadsheet read a cell as a formula. */
const FORMULA_START = /^[=+\-@\t\r]/;

/**
 * One CSV cell. Quoted when it holds a comma, quote or line break. Text that
 * a spreadsheet would run as a formula ("=HYPERLINK(...)", "+cmd|...") gets a
 * leading apostrophe, so it shows as typed. Numbers are left alone: -12.5 is
 * a number, not a formula.
 */
export function csvField(field: string | number | null | undefined): string {
  if (field === null || field === undefined) return '';
  let text = String(field);
  if (typeof field === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

/**
 * The export's month and year from the query string, or null if either is
 * not a real month (1-12) or a four-digit year.
 */
export function parseMonthYear(
  month: string | null,
  year: string | null
): { month: number; year: number } | null {
  if (!month || !year || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) {
    return null;
  }
  const m = Number(month);
  if (m < 1 || m > 12) return null;
  return { month: m, year: Number(year) };
}

/** Mandaue's clock. The app serves one city, so months are Manila months. */
const MANILA_UTC_OFFSET_HOURS = 8;

/**
 * The UTC instants where a Manila calendar month starts and where the next
 * one begins (use them as `created_at >= start AND created_at < end`).
 * Built from Date.UTC, so the server's own timezone never leaks in: on a
 * UTC host, a report filed at 00:30 Manila time on the 1st belongs to the
 * new month, not the old one.
 */
export function monthRangeUtc(
  month: number,
  year: number
): { start: Date; end: Date } {
  const offset = MANILA_UTC_OFFSET_HOURS * 60 * 60 * 1000;
  return {
    start: new Date(Date.UTC(year, month - 1, 1) - offset),
    end: new Date(Date.UTC(year, month, 1) - offset),
  };
}
