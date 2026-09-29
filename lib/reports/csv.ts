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
