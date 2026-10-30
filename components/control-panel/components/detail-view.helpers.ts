/** The three measurements of a scrolling element that say where it stands. */
export interface ScrollMetrics {
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
}

/**
 * Whether the element is scrolled as far down as it goes. Also true when its
 * content fits and there is nothing to scroll. Positions are fractional on
 * zoomed and high-density screens, hence the tolerance.
 */
export function isAtScrollEnd(
  { scrollTop, clientHeight, scrollHeight }: ScrollMetrics,
  tolerance = 2
): boolean {
  return scrollTop + clientHeight >= scrollHeight - tolerance;
}

/**
 * Which timeline dot is the current one. `inViewIndex` is the card last seen
 * in the middle of the panel (-1 before any). The last cards can never get
 * there, because the scroll stops with them at the bottom edge, so reaching
 * the end counts as reaching the last card.
 */
export function activeTimelineIndex(
  inViewIndex: number,
  atScrollEnd: boolean,
  cardCount: number
): number {
  if (cardCount <= 0) return -1;
  if (atScrollEnd) return cardCount - 1;
  return Math.min(inViewIndex, cardCount - 1);
}
