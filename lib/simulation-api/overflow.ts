/** The sentinel older stored scenarios use for "never overflowed". */
export const NEVER_OVERFLOWED = 9999;

/**
 * Minutes until a node first overflowed, or null if it never did.
 *
 * The backend now sends null for "never", but the stored per-return-period
 * scenarios predate that and still carry the 9999 sentinel. Every mapper
 * that reads an overflow time goes through here, so the sentinel cannot
 * reach the table, the slideshow or the charts as if it were a measurement.
 * Anything that is not a finite number counts as missing too.
 */
export function normaliseOverflowMinutes(
  minutes: number | null | undefined
): number | null {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) return null;
  return minutes === NEVER_OVERFLOWED ? null : minutes;
}
