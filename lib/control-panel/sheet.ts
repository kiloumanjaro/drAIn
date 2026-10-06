/**
 * On phones the control panel is a sheet docked to the bottom of the screen.
 * It rests at one of three heights: a bar showing only its tabs, about half
 * the screen (the map stays usable above it), or nearly all of it.
 */
export type SheetState = 'collapsed' | 'half' | 'full';

const ORDER: readonly SheetState[] = ['collapsed', 'half', 'full'];

/** How far a drag on the handle must travel, in pixels, to count as one. */
export const SHEET_DRAG_THRESHOLD = 30;

/** One step taller or shorter; stays put at either end. */
export function stepSheet(state: SheetState, direction: 'up' | 'down') {
  const index = ORDER.indexOf(state) + (direction === 'up' ? 1 : -1);
  return ORDER[Math.min(ORDER.length - 1, Math.max(0, index))];
}

/**
 * Where a tap on the handle takes the sheet: up a step, and from the top
 * back down to the bar, so one control reaches every height.
 */
export function cycleSheet(state: SheetState): SheetState {
  return state === 'full' ? 'collapsed' : stepSheet(state, 'up');
}

/**
 * Where a drag on the handle leaves the sheet. `deltaY` is how far the
 * pointer moved down the screen (negative is up). Null means the movement
 * was too small to be a drag, so it should be treated as a tap.
 */
export function sheetAfterDrag(
  state: SheetState,
  deltaY: number
): SheetState | null {
  if (Math.abs(deltaY) < SHEET_DRAG_THRESHOLD) return null;
  return stepSheet(state, deltaY < 0 ? 'up' : 'down');
}

/** What the handle does next, for its accessible name. */
export function sheetHandleLabel(state: SheetState): string {
  if (state === 'collapsed') return 'Open panel';
  if (state === 'half') return 'Expand panel';
  return 'Collapse panel';
}
