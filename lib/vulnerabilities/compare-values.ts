export type SortDirection = 'asc' | 'desc';

/** Null, undefined and NaN: a cell with nothing in it. */
function isMissing(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'number' && Number.isNaN(value))
  );
}

/**
 * Compare two table cells for sorting.
 *
 * Empty cells sort last whichever way the column is sorted, so flipping the
 * direction reorders the values rather than bringing the blanks to the top.
 * Numbers compare numerically and anything else as text.
 */
export function compareTableValues(
  a: unknown,
  b: unknown,
  direction: SortDirection
): number {
  const aMissing = isMissing(a);
  const bMissing = isMissing(b);
  if (aMissing || bMissing) {
    if (aMissing && bMissing) return 0;
    return aMissing ? 1 : -1;
  }

  const order =
    typeof a === 'number' && typeof b === 'number'
      ? a - b
      : String(a).localeCompare(String(b));
  return direction === 'asc' ? order : -order;
}
