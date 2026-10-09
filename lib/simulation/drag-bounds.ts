/**
 * How far a floating table may be dragged. Its header can only be grabbed
 * between the search box on its left and the buttons on its right, so
 * enough must stay on screen at either side to leave that stretch in reach.
 */

/** Kept visible when the table is pushed off the right: search box, then header. */
export const KEEP_VISIBLE_LEFT_PART = 400;
/** Kept visible when it is pushed off the left: header, then the buttons. */
export const KEEP_VISIBLE_RIGHT_PART = 320;
/** Kept visible when it is pushed off the bottom: the header's height. */
export const KEEP_VISIBLE_TOP_PART = 60;

export interface DragBounds {
  /** The table's width in pixels. */
  width: number;
  viewportWidth: number;
  viewportHeight: number;
  /** Where the table's positioning container starts on screen. */
  originX: number;
  originY: number;
}

/** The nearest position to `wanted` that leaves the header within reach. */
export function clampDragPosition(
  wanted: { x: number; y: number },
  { width, viewportWidth, viewportHeight, originX, originY }: DragBounds
): { x: number; y: number } {
  const minX = KEEP_VISIBLE_RIGHT_PART - width - originX;
  const maxX = viewportWidth - KEEP_VISIBLE_LEFT_PART - originX;
  const maxY = viewportHeight - KEEP_VISIBLE_TOP_PART - originY;
  return {
    // A screen narrower than the two kept parts leaves no range: pin it left.
    x: Math.max(Math.min(minX, maxX), Math.min(maxX, wanted.x)),
    y: Math.max(0, Math.min(maxY, wanted.y)),
  };
}

/** What the drag limit needs to know about a floating panel and the screen. */
export function measureDragBounds(panel: HTMLElement | null): DragBounds {
  // A table's wrapper is placed inside the map area, which starts to the
  // right of the navigation rail. The parameter panels' wrappers are fixed
  // to the screen: they have no offset parent, so their origin is 0.
  const origin = panel?.parentElement?.offsetParent?.getBoundingClientRect();
  return {
    width: panel?.offsetWidth ?? 500,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    originX: origin?.left ?? 0,
    originY: origin?.top ?? 0,
  };
}

/** Where the control panel ends, from the left of the map area (tablet width up). */
export const CONTROL_PANEL_RIGHT = 404;
/** The strip down the right edge of the screen that holds the map buttons. */
export const MAP_BUTTONS_STRIP = 70;
/** Kept clear around a panel where it starts: the control panel's own margin. */
export const START_MARGIN = 20;

export interface StartBounds {
  /** The panel's size, used to centre it on the anchor. */
  width: number;
  height: number;
  /** Fraction of the viewport to anchor to. */
  anchorX: number;
  anchorY: number;
  /** The narrowest the panel gets. */
  minWidth: number;
  /** Its width with everything shown; room is left for this much if there is any. */
  fullWidth: number;
  viewportWidth: number;
  viewportHeight: number;
  /** Where the map area starts on screen: the navigation rail's width. */
  mapLeft: number;
  /** Where the panel's positioning container starts on screen. */
  originX: number;
}

/**
 * Where a floating panel opens before it has been dragged anywhere: at its
 * anchor, moved as needed to sit between the control panel and the map
 * buttons with its header on screen. A screen too narrow for that gets it
 * as far right as it fits, over the control panel.
 */
export function startPosition({
  width,
  height,
  anchorX,
  anchorY,
  minWidth,
  fullWidth,
  viewportWidth,
  viewportHeight,
  mapLeft,
  originX,
}: StartBounds): { x: number; y: number } {
  // Worked out in screen pixels, then moved into the container's.
  const left = mapLeft + CONTROL_PANEL_RIGHT + START_MARGIN;
  const right = viewportWidth - MAP_BUTTONS_STRIP;
  const anchored = originX + viewportWidth * anchorX - width / 2;
  const screenX =
    left + minWidth <= right
      ? Math.max(left, Math.min(anchored, right - fullWidth))
      : Math.max(mapLeft + START_MARGIN, right - minWidth);

  const lowest = viewportHeight - height - START_MARGIN;
  const y = Math.min(viewportHeight * anchorY - height / 2, lowest);
  return {
    x: screenX - originX,
    // A screen shorter than the panel: the top wins, where the header is.
    y: Math.max(START_MARGIN, y),
  };
}
