// The worker's decisions, apart from its I/O: what a Nominatim answer means
// for a report, how long to wait before the next request, and when to give
// up on a run. Nothing here touches Deno, the network or the database, so
// `pnpm vitest run supabase/functions` tests it (decide.test.ts).

/** Nominatim's usage policy: at most one request a second. */
export const MIN_REQUEST_GAP_MS = 1000;

/**
 * This many "service unavailable" answers in a row end the run: the service
 * is down or has started refusing us, and more requests would only make
 * that worse.
 */
export const MAX_CONSECUTIVE_UNAVAILABLE = 3;

export type GeocodeOutcome =
  // An address to save; the report is 'completed'.
  | { kind: 'address'; address: string }
  // The service answered and has nothing for this position. Asking again
  // would get the same answer, so the report is 'failed' for good.
  | { kind: 'no_result' }
  // The service could not be asked (no connection, a timeout, an error
  // page, a rate limit). Says nothing about the report, which stays
  // 'pending' for a later run.
  | { kind: 'unavailable' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * What one reverse-geocoding answer means.
 *
 * `status` is the HTTP status, or null when no response arrived at all.
 * `body` is the parsed JSON of a 2xx response, or undefined when it could
 * not be parsed.
 */
export function classifyGeocodeResponse(
  status: number | null,
  body?: unknown
): GeocodeOutcome {
  if (status === null) return { kind: 'unavailable' };
  // 429: too many requests. 403: Nominatim's answer to a client it has
  // blocked for breaking the usage policy. 408 and 5xx: its own trouble.
  if (status === 429 || status === 403 || status === 408 || status >= 500) {
    return { kind: 'unavailable' };
  }
  // Any other refusal is about the request itself (400 for coordinates out
  // of range), and the same request would be refused again.
  if (status < 200 || status >= 300) return { kind: 'no_result' };

  // A 2xx that isn't the JSON object Nominatim sends (a proxy's page, a
  // body cut short) is the service misbehaving, not an answer.
  if (!isRecord(body)) return { kind: 'unavailable' };
  // Nominatim answers 200 with { "error": "Unable to geocode" } for a
  // position it has nothing for (open sea, say).
  if (body.error !== undefined || !isRecord(body.address)) {
    return { kind: 'no_result' };
  }

  const addr = body.address;
  const text = (value: unknown) =>
    typeof value === 'string' && value.trim() ? value.trim() : null;
  const parts = [
    text(addr.road),
    text(addr.suburb) ?? text(addr.neighbourhood),
    text(addr.city) ?? 'Mandaue City',
    'Cebu, Philippines',
  ].filter(Boolean);
  return { kind: 'address', address: parts.join(', ') };
}

/**
 * Milliseconds to wait before the next request so that requests are at least
 * MIN_REQUEST_GAP_MS apart. `lastRequestAt` is when the previous request
 * finished (null before the first), whatever its outcome: a failed request
 * counts against the limit like any other.
 */
export function msUntilNextRequest(
  lastRequestAt: number | null,
  now: number
): number {
  if (lastRequestAt === null) return 0;
  const elapsed = now - lastRequestAt;
  // A clock that went backwards must not turn into a long sleep.
  if (elapsed < 0) return MIN_REQUEST_GAP_MS;
  return Math.max(0, MIN_REQUEST_GAP_MS - elapsed);
}

/** True once the run should stop asking: the service looks down. */
export function shouldStopRun(consecutiveUnavailable: number): boolean {
  return consecutiveUnavailable >= MAX_CONSECUTIVE_UNAVAILABLE;
}
