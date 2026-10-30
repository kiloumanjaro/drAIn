/**
 * A first look at the access token the chatbot route is sent, before the
 * route asks the auth server about it. Checking a token is a network call,
 * and until that call answers nothing counts the request against any limit,
 * so a caller sending junk tokens could make the server place those calls
 * for free. This refuses what could never pass: text that isn't shaped like
 * a JWT, and tokens that say themselves they have expired.
 *
 * It verifies nothing. The signature is not looked at and anyone can write a
 * payload that gets through, so a token that passes here still has to pass
 * `auth.getUser`.
 */

/** Seconds a token may be past its expiry, for clocks that disagree. */
export const CLOCK_SKEW_SECONDS = 60;

/**
 * Longest token looked at, in characters. A Supabase access token is about
 * 1,000; anything near this size is not one, and is refused undecoded.
 */
export const MAX_TOKEN_CHARS = 8192;

const BASE64URL = /^[A-Za-z0-9_-]+$/;

/** The JSON object a base64url part holds, or null if it doesn't hold one. */
function decodePart(part: string): Record<string, unknown> | null {
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    // atob gives one character per byte, which mangles non-ASCII text
    // inside strings but leaves the JSON's structure and numbers intact,
    // and those are all that is read here.
    const value: unknown = JSON.parse(atob(base64));
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * True if `token` could be a live access token: three base64url parts, a
 * header and a payload that are JSON objects, and an `exp` (seconds since
 * 1970, which every Supabase access token carries) that has not passed by
 * more than CLOCK_SKEW_SECONDS.
 */
export function looksLikeLiveJwt(
  token: string,
  nowMs: number = Date.now()
): boolean {
  if (typeof token !== 'string' || token.length > MAX_TOKEN_CHARS) {
    return false;
  }
  const parts = token.split('.');
  if (parts.length !== 3 || !parts.every((part) => BASE64URL.test(part))) {
    return false;
  }
  if (!decodePart(parts[0])) return false;
  const payload = decodePart(parts[1]);
  if (!payload) return false;

  const { exp } = payload;
  if (typeof exp !== 'number' || !Number.isFinite(exp)) return false;
  return exp + CLOCK_SKEW_SECONDS >= nowMs / 1000;
}
