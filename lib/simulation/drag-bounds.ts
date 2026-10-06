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
