import { describe, expect, it } from 'vitest';
import {
  PHONE_PIN_TOP_PX,
  TABLET_PIN_LEFT_OF_CENTRE_PX,
  TABLET_PIN_TOP_PX,
  TABLET_POPUP_BOTTOM_PX,
  reportPinCrowded,
  reportPinOffRest,
  reportPinOffset,
  reportPinRecentre,
  reportPinRest,
} from './report-pin';

/** Where the pin's point lands on a map of this size, from its top left. */
function landing(
  layout: 'phone' | 'tablet',
  mapWidth: number,
  mapHeight: number
) {
  const [dx, dy] = reportPinOffset(layout, mapHeight)!;
  return { x: mapWidth / 2 + dx, y: mapHeight / 2 + dy };
}

describe('reportPinOffset', () => {
  it('leaves the pin in the middle of the map on a desktop', () => {
    expect(reportPinOffset('desktop', 900)).toBeUndefined();
  });

  it('rests the pin just under the navigation button on a phone', () => {
    expect(reportPinOffset('phone', 844)).toEqual([0, PHONE_PIN_TOP_PX - 422]);
    expect(landing('phone', 390, 844)).toEqual({ x: 195, y: 88 });
  });

  it('rests the pin near the top on a tablet, above the half-height sheet', () => {
    // Map sizes at 768x1024 and 1000x700, less the 59px navigation rail.
    for (const [width, height] of [
      [709, 1024],
      [941, 700],
    ]) {
      const { y } = landing('tablet', width, height);
      expect(y).toBe(TABLET_PIN_TOP_PX);
      // The sheet starts 45% of the way down.
      expect(y).toBeLessThan(height * 0.45);
    }
  });

  it('keeps the tablet popup between the map edges and the buttons', () => {
    // The popup ends 316px right of the pin's point; the buttons start 56px
    // in from the map's right edge.
    for (const width of [709, 964]) {
      const { x } = landing('tablet', width, 1024);
      expect(x).toBe(width / 2 - TABLET_PIN_LEFT_OF_CENTRE_PX);
      expect(x - 15).toBeGreaterThan(0);
      expect(x + 316).toBeLessThan(width - 56);
    }
  });
});

describe('reportPinCrowded', () => {
  it('is true on a tablet-width screen too short for the popup', () => {
    // Large phones on their sides.
    for (const height of [360, 390, 430]) {
      expect(reportPinCrowded('tablet', height), `${height}px`).toBe(true);
    }
  });

  it('is false where the popup fits above the half-height sheet', () => {
    for (const height of [700, 768, 1024]) {
      expect(reportPinCrowded('tablet', height), `${height}px`).toBe(false);
    }
  });

  it('leaves room for the popup above the collapsed sheet (5.25rem)', () => {
    expect(TABLET_POPUP_BOTTOM_PX).toBeLessThan(360 - 84);
  });

  it('never asks on a phone or a desktop, which stay as they were', () => {
    expect(reportPinCrowded('phone', 375)).toBe(false);
    expect(reportPinCrowded('desktop', 390)).toBe(false);
  });
});

describe('reportPinRest', () => {
  it('is where the offset puts the pin, from the top left of the map', () => {
    const offset = reportPinOffset('tablet', 1024)!;
    expect(reportPinRest(offset, 709, 1024)).toEqual({
      x: 709 / 2 - TABLET_PIN_LEFT_OF_CENTRE_PX,
      y: TABLET_PIN_TOP_PX,
    });
  });
});

describe('reportPinOffRest', () => {
  const rest = { x: 204, y: TABLET_PIN_TOP_PX };

  it('is true for a pin that terrain lifted towards the top edge', () => {
    expect(reportPinOffRest({ x: 204, y: 27 }, rest)).toBe(true);
  });

  it('is true however far a hill lifted the pin', () => {
    // The inlet on the 50m contour: above the top of a tablet's screen.
    expect(reportPinOffRest({ x: 204, y: -70 }, rest)).toBe(true);
    expect(reportPinOffRest({ x: 204, y: -480 }, rest)).toBe(true);
  });

  it('leaves alone a pin that is where it was sent, near enough', () => {
    expect(reportPinOffRest(rest, rest)).toBe(false);
    expect(reportPinOffRest({ x: 205, y: 65 }, rest)).toBe(false);
  });
});

describe('reportPinRecentre', () => {
  it('shifts the centre by what separates the pin from its rest', () => {
    const [lng, lat] = reportPinRecentre(
      [123.9, 10.3],
      [123.95, 10.35],
      [123.94, 10.37]
    );
    expect(lng).toBeCloseTo(123.91, 10);
    expect(lat).toBeCloseTo(10.28, 10);
  });

  it('keeps the centre for a pin already at its rest', () => {
    expect(
      reportPinRecentre([123.9, 10.3], [123.95, 10.35], [123.95, 10.35])
    ).toEqual([123.9, 10.3]);
  });
});
