/** A report bubble as the map should show it: which report, and what it says. */
export interface BubbleState {
  id: string;
  /** Changes exactly when the bubble has to be drawn again. */
  signature: string;
}

export interface BubbleDiff {
  /** Reports with no bubble yet, in the order given. */
  add: string[];
  /** Bubbles whose report is no longer on the map. */
  remove: string[];
  /** Bubbles that stay but whose report or count changed. */
  update: string[];
}

/**
 * Everything a bubble shows, as one string: the report itself and how many
 * reports its component has. Two equal signatures draw the same bubble.
 */
export function reportBubbleSignature(report: object, count: number): string {
  return `${count}|${JSON.stringify(report)}`;
}

/**
 * What to do to the bubbles on the map so they match `next`.
 *
 * `previous` maps the id of each bubble on the map to the signature it was
 * last drawn with. A report listed twice in `next` counts once, as first
 * listed.
 */
export function diffReportBubbles(
  previous: ReadonlyMap<string, string>,
  next: readonly BubbleState[]
): BubbleDiff {
  const add: string[] = [];
  const update: string[] = [];
  const seen = new Set<string>();

  for (const { id, signature } of next) {
    if (seen.has(id)) continue;
    seen.add(id);

    const drawn = previous.get(id);
    if (drawn === undefined) add.push(id);
    else if (drawn !== signature) update.push(id);
  }

  const remove = [...previous.keys()].filter((id) => !seen.has(id));

  return { add, remove, update };
}
