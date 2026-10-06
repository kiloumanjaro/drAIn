import { DEFAULT_STYLE, MAP_STYLES } from './config';

/** The base maps the style button steps through, starting where the map opens. */
export const MAP_STYLE_CYCLE: readonly string[] = [
  DEFAULT_STYLE,
  MAP_STYLES.SATELLITE,
  MAP_STYLES.STREETS,
];

/**
 * The base map that follows `current`, wrapping round to the first. A style
 * that isn't in the cycle goes to the first one.
 */
export function nextMapStyle(current: string): string {
  const index = MAP_STYLE_CYCLE.indexOf(current);
  return MAP_STYLE_CYCLE[(index + 1) % MAP_STYLE_CYCLE.length];
}
