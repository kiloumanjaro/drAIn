/**
 * Where an opened report pin comes to rest on /map.
 *
 * On phones and tablets the control panel is a sheet over the bottom of the
 * screen (55dvh at its usual height; SHEET_HEIGHT in
 * components/control-panel), so the middle of the map puts the pin and its
 * popup behind it. The pin is sent near the top instead.
 */

/**
 * Phones: the navigation button is over the top left of the map. Written
 * the way Tailwind writes `max-md:`, which places the popup, so the two
 * agree at every width.
 */
export const PHONE_QUERY = '(width < 48rem)';

export type ReportPinLayout = 'phone' | 'tablet' | 'desktop';

/**
 * Phones: how far below the top of the map the pin rests. The popup opens
 * below the pin there, and this is just under the navigation button, which
 * leaves the popup the rest of the map above the sheet.
 */
export const PHONE_PIN_TOP_PX = 88;

/**
 * Tablets: there is no navigation button to clear, and the popup opens
 * beside the pin, level with it, so the pin goes as high as leaves the pin
 * (30px, drawn above its point) a margin. That keeps the popup above the
 * sheet on a tablet held sideways, where 45dvh is little more than 300px.
 * (A screen shorter than that: see reportPinCrowded.)
 */
export const TABLET_PIN_TOP_PX = 64;

/**
 * Tablets: how far below the top of the map the popup can reach. Its top is
 * level with the pin's, 27px above the point, and it is at most 224px tall
 * (the description stops at six lines and scrolls, in
 * components/map/report-bubble.tsx), plus an 8px margin.
 */
export const TABLET_POPUP_BOTTOM_PX = TABLET_PIN_TOP_PX - 27 + 224 + 8;

/**
 * Tablets: the popup reaches about 316px to the right of the pin's point and
 * the pin 15px to its left, so the pair's middle is 150px right of the point.
 * Moving the point that far left of the map's centre centres the pair, which
 * keeps the popup clear of the buttons down the map's right edge at every
 * tablet width (the map is 709px wide at its narrowest there).
 */
export const TABLET_PIN_LEFT_OF_CENTRE_PX = 150;

/**
 * The `offset` for the flyTo that opens a pin: where the pin ends up,
 * measured from the centre of the map. Undefined where the pin simply goes
 * to the centre.
 */
export function reportPinOffset(
  layout: ReportPinLayout,
  mapHeight: number
): [number, number] | undefined {
  if (layout === 'phone') return [0, PHONE_PIN_TOP_PX - mapHeight / 2];
  if (layout === 'tablet') {
    return [-TABLET_PIN_LEFT_OF_CENTRE_PX, TABLET_PIN_TOP_PX - mapHeight / 2];
  }
  return undefined;
}

/**
 * Whether the half-open sheet (it starts 45% of the way down) leaves too
 * little map for a pin's popup. True only on a tablet-width screen that is
 * short: a large phone on its side, 390px high, has 175px above the sheet,
 * and the popup's footer went behind it. The sheet is collapsed to its bar
 * for a pin opened there.
 */
export function reportPinCrowded(
  layout: ReportPinLayout,
  mapHeight: number
): boolean {
  return layout === 'tablet' && mapHeight * 0.45 < TABLET_POPUP_BOTTOM_PX;
}

/** A place on the map, in pixels from its top left. */
export interface MapPoint {
  x: number;
  y: number;
}

/**
 * Where the pin's point is meant to rest on a map of this size, for a
 * layout that sends it somewhere (see reportPinOffset).
 */
export function reportPinRest(
  offset: [number, number],
  mapWidth: number,
  mapHeight: number
): MapPoint {
  return { x: mapWidth / 2 + offset[0], y: mapHeight / 2 + offset[1] };
}

/** Closer to its rest than this, a pin is left alone. */
export const PIN_SETTLED_WITHIN_PX = 2;

/**
 * How many times a pin sent to its rest is looked at again. Moving it the
 * last of the way puts the camera over other ground, which can leave a
 * little to correct once more: the inlet on the 50m contour took three
 * moves to settle.
 */
export const PIN_REST_CHECKS = 4;

/**
 * Whether a pin that has been sent to its rest needs moving the last of the
 * way. The move aims at the pin's place on flat ground, and the map is
 * tilted over terrain, so a pin on a hill is drawn further up the screen:
 * the inlet on the 50m contour came to rest above the top edge of a
 * tablet's screen.
 */
export function reportPinOffRest(pin: MapPoint, rest: MapPoint): boolean {
  return Math.hypot(pin.x - rest.x, pin.y - rest.y) > PIN_SETTLED_WITHIN_PX;
}

/**
 * The map centre that brings the pin to its rest: the map is shifted by
 * what separates the pin from the ground now showing at its rest. All
 * three are [longitude, latitude].
 */
export function reportPinRecentre(
  centre: [number, number],
  pin: [number, number],
  atRest: [number, number]
): [number, number] {
  return [centre[0] + (pin[0] - atRest[0]), centre[1] + (pin[1] - atRest[1])];
}
