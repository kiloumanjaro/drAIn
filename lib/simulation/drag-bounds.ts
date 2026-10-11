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
  /**
   * Where on screen the panel's left edge must stop, for a panel that may
   * not leave by the left at all. Set for the parameter panels: their title
   * is at the left of the header, and being fixed to the screen they would
   * otherwise slide over the navigation rail. Left out for the tables, which
   * may go off the left as far as `KEEP_VISIBLE_RIGHT_PART` allows.
   */
  leftLimit?: number;
}

/** The nearest position to `wanted` that leaves the header within reach. */
export function clampDragPosition(
  wanted: { x: number; y: number },
  {
    width,
    viewportWidth,
    viewportHeight,
    originX,
    originY,
    leftLimit,
  }: DragBounds
): { x: number; y: number } {
  const maxX = viewportWidth - KEEP_VISIBLE_LEFT_PART - originX;
  const maxY = viewportHeight - KEEP_VISIBLE_TOP_PART - originY;
  const minX =
    leftLimit === undefined
      ? // A screen narrower than the two kept parts leaves no range: pin it left.
        Math.min(KEEP_VISIBLE_RIGHT_PART - width - originX, maxX)
      : // The left limit wins on a screen too narrow for both.
        leftLimit - originX;
  return {
    x: Math.max(minX, Math.min(maxX, wanted.x)),
    y: Math.max(0, Math.min(maxY, wanted.y)),
  };
}

/** Where the map area starts on screen: the navigation rail's width. */
function mapAreaLeft(): number {
  const mapArea = document.getElementById('main-content');
  return mapArea?.getBoundingClientRect().left ?? 0;
}

/** What the drag limit needs to know about a floating panel and the screen. */
export function measureDragBounds(panel: HTMLElement | null): DragBounds {
  // A table's wrapper is placed inside the map area, which starts to the
  // right of the navigation rail. The parameter panels' wrappers are fixed
  // to the screen: they have no offset parent, so their origin is 0, and
  // nothing but a left limit keeps them off the rail. (With origin 0 the
  // tables' rule let a 450px panel go 130px past the screen's left edge.)
  const wrapper = panel?.parentElement;
  const container = wrapper?.offsetParent;
  const origin = container?.getBoundingClientRect();
  return {
    width: panel?.offsetWidth ?? 500,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    originX: origin?.left ?? 0,
    originY: origin?.top ?? 0,
    leftLimit: wrapper && !container ? mapAreaLeft() : undefined,
  };
}

/**
 * Where the control panel ends, from the left of the map area. Only on
 * desktop (1024px up), where it floats: below that it is a sheet across the
 * bottom and the panels here are pinned, so no start position is used.
 */
export const CONTROL_PANEL_RIGHT = 404;
/** The strip down the right edge of the screen that holds the map buttons. */
export const MAP_BUTTONS_STRIP = 70;
/** The buttons themselves: 34px wide, 20px in from the edge of the screen. */
export const MAP_BUTTONS_WIDTH = 54;
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
 * as far right as it fits, without the margin beside the control panel:
 * the results table on a screen under 1053px wide. Under 1033px that put
 * its first 9px behind the control panel, so there it stops at the panel's
 * edge and takes the room from the buttons' strip instead, still short of
 * the buttons. Below 1024px the panels are pinned across the top instead
 * (lib/layout/compact-map.ts) and the result is not used.
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
  const panelEdge = mapLeft + CONTROL_PANEL_RIGHT;
  const fitsBesidePanel =
    panelEdge + minWidth <= viewportWidth - MAP_BUTTONS_WIDTH;
  const screenX =
    left + minWidth <= right
      ? Math.max(left, Math.min(anchored, right - fullWidth))
      : Math.max(
          fitsBesidePanel ? panelEdge : mapLeft + START_MARGIN,
          right - minWidth
        );

  const lowest = viewportHeight - height - START_MARGIN;
  const y = Math.min(viewportHeight * anchorY - height / 2, lowest);
  return {
    x: screenX - originX,
    // A screen shorter than the panel: the top wins, where the header is.
    y: Math.max(START_MARGIN, y),
  };
}
