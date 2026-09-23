/**
 * Pure calculations behind the dashboard figures.
 *
 * Kept clear of the Supabase client, which `queries.ts` builds at import
 * time from environment variables, so these can be exercised on their own.
 */

/** Days between two ISO timestamps, or null if either is unusable. */
export function daysBetween(
  from: string | null,
  to: string | null
): number | null {
  if (!from || !to) return null;

  const start = new Date(from).getTime();
  const end = new Date(to).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;

  // Work recorded before the report it closes means the link is wrong, not
  // that it was fixed in advance. Counting it would drag the median down.
  if (end < start) return null;

  return (end - start) / (1000 * 60 * 60 * 24);
}

/**
 * The middle value, or null for an empty set.
 *
 * Median rather than mean throughout: one report left open for a year
 * should not swamp fifty closed the next day.
 */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}
