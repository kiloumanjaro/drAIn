import { simulationKeys } from '@/lib/query/keys';
import { fetchYRTable, type YearOption } from './fetch-yr-table';

/**
 * How long a stored table's loading state stays up at the least. A cached
 * table arrives at once, and a spinner that flashes reads as a glitch.
 */
export const STORED_TABLE_MIN_LOADING_MS = 400;

/**
 * Query options for one return period's stored results.
 *
 * The results are reference data: they change only when the database is
 * reseeded, so they are never stale. A failed load is not retried here; the
 * person is told and can ask again.
 */
export function storedTableQuery(year: YearOption) {
  return {
    queryKey: simulationKeys.storedTable(year),
    queryFn: () => fetchYRTable(year),
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
    retry: false,
  } as const;
}

/** Resolves with the promise's value, but no sooner than `ms` from now. */
export async function withMinimumDuration<T>(
  promise: Promise<T>,
  ms: number
): Promise<T> {
  const [value] = await Promise.all([
    promise,
    new Promise((resolve) => setTimeout(resolve, ms)),
  ]);
  return value;
}

/** A Map of per-component parameters as the plain object the API takes. */
export function paramsById<T>(params: Map<string, T>): Record<string, T> {
  const byId: Record<string, T> = {};
  params.forEach((value, id) => {
    byId[id] = value;
  });
  return byId;
}
