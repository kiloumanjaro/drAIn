import type { FloodEvent } from '@/components/docs-page/flood-event-cards';

/**
 * The section a `?section=` value names, or `fallback` when it is missing or
 * not one of `ids`. The URL is anyone's to type, so it is never trusted.
 */
export function parseSectionParam<T extends string>(
  param: string | null | undefined,
  ids: readonly T[],
  fallback: T
): T {
  return ids.find((id) => id === param) ?? fallback;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Whether `value` has the shape the flood event cards render. */
export function isFloodEvent(value: unknown): value is FloodEvent {
  if (!isPlainObject(value)) return false;
  if (typeof value.eventName !== 'string') return false;
  if (typeof value.summary !== 'string') return false;
  if (!isPlainObject(value.data)) return false;
  return Object.values(value.data).every((v) => typeof v === 'string');
}

/**
 * The event in a `?compareEvent=` value, or null when there is none or it is
 * not a flood event. `param` is as `searchParams.get` returns it: already
 * percent-decoded, so it is not decoded again here (a literal "%" in the
 * text would throw).
 */
export function parseCompareEventParam(
  param: string | null | undefined
): FloodEvent | null {
  if (!param) return null;
  try {
    const parsed: unknown = JSON.parse(param);
    return isFloodEvent(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
