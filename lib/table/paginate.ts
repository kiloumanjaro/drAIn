/**
 * Splitting a long table into pages. The whole list stays in memory, sorted
 * and filtered as before; only the rows of one page are drawn.
 */

export interface PageRange {
  /** The page shown, counted from 1. */
  page: number;
  /** How many pages there are: at least 1, so an empty table has a page. */
  pageCount: number;
  /** The page's rows are `rows.slice(start, end)`. */
  start: number;
  end: number;
}

/**
 * The page nearest to `wantedPage` that exists, and the rows on it. A list
 * that has shrunk (a search, say) leaves the wanted page past the end: the
 * last page is shown instead.
 */
export function paginate(
  total: number,
  pageSize: number,
  wantedPage: number
): PageRange {
  const rows = Math.max(0, Math.floor(total) || 0);
  const size = Math.max(1, Math.floor(pageSize) || 1);
  const pageCount = Math.max(1, Math.ceil(rows / size));
  const page = Math.min(pageCount, Math.max(1, Math.floor(wantedPage) || 1));
  const start = (page - 1) * size;
  return { page, pageCount, start, end: Math.min(rows, start + size) };
}

/** "101–200 of 1,369": which rows the page holds, counted from 1. */
export function pageLabel({ start, end }: PageRange, total: number): string {
  const count = total.toLocaleString('en-US');
  if (end <= start) return `0 of ${count}`;
  const first = (start + 1).toLocaleString('en-US');
  return end - start === 1
    ? `${first} of ${count}`
    : `${first}–${end.toLocaleString('en-US')} of ${count}`;
}
