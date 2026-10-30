/**
 * The map pages (/map and /simulation) have two layouts. "Compact" is the
 * one for phones and tablets: the control panel is a sheet across the bottom
 * of the screen, results tables and parameter panels are pinned across the
 * top, and the map's buttons sit at the top. It applies below Tailwind's
 * `lg`, so the classes that build it are `max-lg:` and this query must stay
 * in step with them. It is written the way Tailwind writes `max-lg:`, in
 * rem and as a range: a window can be a fraction of a pixel under 1024px
 * wide (display scaling, zoom), and `(max-width: 1023px)` called that one
 * desktop while the classes still laid it out compact.
 *
 * The navigation drawer has its own, smaller breakpoint
 * (hooks/use-mobile.ts): a tablet gets the compact map and keeps the
 * navigation rail.
 */
export const COMPACT_MAP_QUERY = '(width < 64rem)';

/** False on the server, where there is no window to measure. */
export function isCompactMap(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(COMPACT_MAP_QUERY).matches;
}
