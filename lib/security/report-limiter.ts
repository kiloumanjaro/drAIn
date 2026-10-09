/**
 * Keeps the CSP report endpoint (app/api/csp-report) from being used to
 * flood the server log. Anyone can post there and every violation becomes a
 * log line, so three things bound what one caller, or many, can write:
 *
 * - each address may send a number of reports a minute (a token bucket);
 * - a line already logged is not logged again for a while, only counted;
 * - all callers together may write a number of lines a minute.
 *
 * The last is what holds when the address can't be trusted: off a platform
 * that sets it, the forwarding headers are whatever the caller sent, so a
 * caller can pose as any number of addresses.
 *
 * Everything is kept in this process's memory, in maps of bounded size. On
 * serverless hosting each instance has its own and loses it when it is
 * recycled, so these are per-instance, best-effort limits: enough to stop a
 * log flood, not a guarantee, and not for anything that costs money (the
 * chatbot's allowance is kept in the database for that reason).
 */

export interface ReportLimiterOptions {
  /** Reports one address may send in a minute, and in one burst. */
  perAddressPerMinute?: number;
  /** Log lines all callers together may cause in a minute. */
  totalLinesPerMinute?: number;
  /** Addresses remembered; the least recently seen is forgotten first. */
  maxAddresses?: number;
  /** How long a logged line is counted rather than logged again. */
  repeatWindowMs?: number;
  /** Distinct lines remembered; the least recently seen is forgotten first. */
  maxLines?: number;
  /** The clock, in milliseconds. Replaced in tests. */
  now?: () => number;
}

export interface ReportLimiter {
  /** Takes one report from the address's allowance. False when it is spent. */
  admit(address: string): boolean;
  /**
   * The text to log for `line`, or null to log nothing: it was logged
   * recently, or the log has had its share for now. When a line comes round
   * again after its quiet period, the text says how many were left out.
   */
  lineToLog(line: string): string | null;
  /** Addresses and lines currently remembered. For tests. */
  size(): { addresses: number; lines: number };
}

const MINUTE_MS = 60_000;

/** Longest address kept as a key; an IPv6 address is at most 45 characters. */
const MAX_ADDRESS_CHARS = 64;

/**
 * The caller's address, as far as the headers say. `x-real-ip` and the first
 * entry of `x-forwarded-for` are the client's address on hosts that set them
 * (Vercel overwrites both); elsewhere they are the caller's own claim. Every
 * request without either shares the one key 'unknown'.
 */
export function clientAddress(headers: Headers): string {
  const candidate =
    headers.get('x-real-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0] ??
    '';
  const address = candidate
    .trim()
    .toLowerCase()
    .replace(/[^0-9a-f.:]/g, '')
    .slice(0, MAX_ADDRESS_CHARS);
  return address || 'unknown';
}

interface Bucket {
  tokens: number;
  updatedAt: number;
}

/** Refills the bucket for the time passed, then takes a token if it has one. */
function take(bucket: Bucket, capacity: number, now: number): boolean {
  // A clock that went backwards refills nothing.
  const elapsed = Math.max(0, now - bucket.updatedAt);
  bucket.tokens = Math.min(
    capacity,
    bucket.tokens + (elapsed * capacity) / MINUTE_MS
  );
  bucket.updatedAt = now;
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

/**
 * Moves `key` to the newest end of the map (a Map keeps insertion order) and
 * drops the oldest entries over `max`.
 */
function remember<V>(map: Map<string, V>, key: string, value: V, max: number) {
  map.delete(key);
  map.set(key, value);
  while (map.size > max) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) break;
    map.delete(oldest);
  }
}

export function createReportLimiter(
  options: ReportLimiterOptions = {}
): ReportLimiter {
  const {
    perAddressPerMinute = 20,
    totalLinesPerMinute = 60,
    maxAddresses = 1000,
    repeatWindowMs = 10 * MINUTE_MS,
    maxLines = 200,
    now = Date.now,
  } = options;

  const addresses = new Map<string, Bucket>();
  const lines = new Map<string, { loggedAt: number; suppressed: number }>();
  const allLines: Bucket = { tokens: totalLinesPerMinute, updatedAt: now() };

  return {
    admit(address) {
      const at = now();
      // A forgotten address starts again with a full bucket, which is the
      // cost of bounding the map; the cap on lines below covers it.
      const bucket = addresses.get(address) ?? {
        tokens: perAddressPerMinute,
        updatedAt: at,
      };
      const allowed = take(bucket, perAddressPerMinute, at);
      remember(addresses, address, bucket, maxAddresses);
      return allowed;
    },

    lineToLog(line) {
      const at = now();
      const seen = lines.get(line);
      if (seen && at - seen.loggedAt < repeatWindowMs && at >= seen.loggedAt) {
        seen.suppressed += 1;
        remember(lines, line, seen, maxLines);
        return null;
      }
      // Not counted as a repeat when the log's share is spent: the line was
      // never written, so there is nothing for it to be a repeat of.
      if (!take(allLines, totalLinesPerMinute, at)) return null;
      remember(lines, line, { loggedAt: at, suppressed: 0 }, maxLines);
      return seen && seen.suppressed > 0
        ? `${line} (and ${seen.suppressed} more like it since last logged)`
        : line;
    },

    size() {
      return { addresses: addresses.size, lines: lines.size };
    },
  };
}
