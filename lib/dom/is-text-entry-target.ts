/** The parts of an element this check reads; lets tests pass a plain object. */
export interface TextEntryTargetLike {
  tagName?: string;
  isContentEditable?: boolean;
}

const TEXT_ENTRY_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Whether a key press aimed at `target` is the user typing into a field, in
 * which case a single-key page shortcut must leave it alone.
 */
export function isTextEntryTarget(
  target: TextEntryTargetLike | null | undefined
): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  return TEXT_ENTRY_TAGS.has((target.tagName ?? '').toUpperCase());
}
