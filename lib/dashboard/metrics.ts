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

/** When each maintenance record was carried out, by table and by bare id. */
export interface MaintenanceDateIndex {
  /** Keyed `${table}:${id}`. */
  byTableAndId: Map<string, string>;
  /** Keyed by id alone; null where more than one table uses that id. */
  byId: Map<string, string | null>;
}

/**
 * Index the maintenance records of every per-component-type table.
 *
 * The records live in four tables, and nothing guarantees their ids are
 * unique across them. Keyed by id alone, a collision silently took the date
 * of whichever table was read last, so records are keyed by table too.
 */
export function indexMaintenanceDates(
  tables: Array<{
    table: string;
    rows: Array<{ id: string | number | null; last_cleaned_at: string }>;
  }>
): MaintenanceDateIndex {
  const byTableAndId = new Map<string, string>();
  const byId = new Map<string, string | null>();

  for (const { table, rows } of tables) {
    for (const row of rows) {
      if (row.id === null || row.id === undefined || row.id === '') continue;
      const id = String(row.id);
      byTableAndId.set(`${table}:${id}`, row.last_cleaned_at);
      byId.set(id, byId.has(id) ? null : row.last_cleaned_at);
    }
  }

  return { byTableAndId, byId };
}

/**
 * When the maintenance that closed a report happened, or null.
 *
 * `table` is the report's resolved_by_maintenance_type. Reports that
 * predate it fall back to the id alone, but only when that is unambiguous.
 */
export function lookupMaintenanceDate(
  index: MaintenanceDateIndex,
  id: string | number | null | undefined,
  table: string | null | undefined
): string | null {
  if (id === null || id === undefined || id === '') return null;
  const key = String(id);
  if (table) return index.byTableAndId.get(`${table}:${key}`) ?? null;
  return index.byId.get(key) ?? null;
}
