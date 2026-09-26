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
 * The middle value, or null for an empty set. Non-finite values are
 * left out.
 *
 * Median rather than mean throughout: one report left open for a year
 * should not swamp fifty closed the next day.
 */
export function median(values: number[]): number | null {
  // Anything non-finite is not a measurement, and NaN would also leave the
  // sort order, and so the middle, undefined.
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return null;

  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

/** When each maintenance record was carried out, keyed by its id. */
export type MaintenanceDateIndex = Map<string, string>;

/** Index maintenance records by id. Ids are unique in the one table. */
export function indexMaintenanceDates(
  rows: Array<{ id: string | null; performed_at: string }>
): MaintenanceDateIndex {
  const index: MaintenanceDateIndex = new Map();
  for (const row of rows) {
    if (row.id) index.set(row.id, row.performed_at);
  }
  return index;
}

/** When the maintenance that closed a report happened, or null. */
export function lookupMaintenanceDate(
  index: MaintenanceDateIndex,
  id: string | null | undefined
): string | null {
  if (!id) return null;
  return index.get(id) ?? null;
}
