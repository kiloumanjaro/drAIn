/**
 * On a tablet the results tables and parameter panels of /simulation are
 * pinned across the top of the map and stop above the control sheet
 * (app/(main)/simulation/simulation-overlays.tsx; their heights are in
 * app/globals.css).
 */

/**
 * What a pinned panel gives up of the map above the half-open sheet: it
 * starts 3.25rem down and stops 8px short of the sheet.
 */
export const PINNED_PANEL_MARGINS_PX = 60;

/**
 * The least height a pinned panel is of use at: a table's header, caveat
 * and pager take 160px between them, and this leaves its column headings
 * and a row.
 */
export const PINNED_PANEL_USEFUL_PX = 240;

/**
 * Whether the half-open sheet (it starts 45% of the way down) leaves a
 * pinned panel too little room. True on a tablet-width screen that is
 * short: a large phone on its side, 390px high, has 116px, which a table's
 * header and caveat filled, with no row on show and the pager out of the
 * box. The sheet is collapsed to its bar for a panel opened there.
 */
export function pinnedPanelCrowded(
  isTablet: boolean,
  viewportHeight: number
): boolean {
  return (
    isTablet &&
    viewportHeight * 0.45 - PINNED_PANEL_MARGINS_PX < PINNED_PANEL_USEFUL_PX
  );
}
