import type { PostgrestError } from '@supabase/supabase-js';

/** The API's per-request row limit: `max_rows` in supabase/config.toml. */
export const PAGE_SIZE = 1000;

/**
 * Read every row of a query, one page at a time.
 *
 * The API returns at most PAGE_SIZE rows per request and doesn't say when it
 * stopped early, so a plain `select` silently drops the rest once a table
 * grows past that. `page` builds the query for one range and must apply a
 * stable order (end with a unique column such as `id`), or rows can repeat
 * or go missing between pages.
 */
export async function fetchAllRows<T>(
  page: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}
