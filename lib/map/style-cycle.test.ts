import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE, MAP_STYLES } from './config';
import { MAP_STYLE_CYCLE, nextMapStyle } from './style-cycle';

describe('nextMapStyle', () => {
  it('moves on from the style the map opens with', () => {
    // The button used to compare style names and never matched the default
    // style's, so the first click did nothing.
    expect(nextMapStyle(DEFAULT_STYLE)).toBe(MAP_STYLES.SATELLITE);
  });

  it('visits every style and comes back to the first', () => {
    let style = DEFAULT_STYLE;
    const seen = [style];
    for (let i = 0; i < MAP_STYLE_CYCLE.length; i++) {
      style = nextMapStyle(style);
      seen.push(style);
    }
    expect(new Set(seen)).toEqual(new Set(MAP_STYLE_CYCLE));
    expect(style).toBe(DEFAULT_STYLE);
  });

  it('starts over from a style it does not know', () => {
    expect(nextMapStyle('mapbox://styles/someone/else')).toBe(DEFAULT_STYLE);
  });
});
