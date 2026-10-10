import type { FloodEvent } from '@/components/docs-page/flood-event-cards';
import { isFloodEvent } from './docs-params';

/**
 * The flood events in an /api/reports body. A body of the wrong shape gives
 * no events, and an entry that is not a flood event is left out.
 */
export function parseFloodEvents(body: unknown): FloodEvent[] {
  if (typeof body !== 'object' || body === null) return [];
  const events = (body as { events?: unknown }).events;
  return Array.isArray(events) ? events.filter(isFloodEvent) : [];
}

/**
 * The most recent event, or null when there are none. The data file lists
 * its events oldest first and carries no date field, so the latest is the
 * last one.
 */
export function latestFloodEvent(
  events: readonly FloodEvent[]
): FloodEvent | null {
  return events[events.length - 1] ?? null;
}

// Strips "Event N: " or "NEW EVENT: " prefix → e.g. "Flash Flood of July 1, 2016"
export function stripPrefix(name: string): string {
  return name.replace(/^(Event\s+\d+|NEW\s+EVENT):\s*/i, '');
}

/**
 * The events in the order the cards show them: newest first, with the
 * comparison event (if any) ahead of them all. An event the comparison event
 * repeats (same name, whatever the prefix) is listed once, in the comparison's
 * place and with the recorded content: the comparison comes from the URL, so
 * its copy of a recorded event is not the one to trust.
 */
export function orderFloodEventCards(
  events: readonly FloodEvent[],
  comparisonEvent?: FloodEvent | null
): FloodEvent[] {
  const newestFirst = [...events].reverse();
  if (!comparisonEvent) return newestFirst;
  const comparisonName = stripPrefix(comparisonEvent.eventName);
  const recorded = newestFirst.find(
    (event) => stripPrefix(event.eventName) === comparisonName
  );
  return [
    recorded ?? comparisonEvent,
    ...newestFirst.filter((event) => event !== recorded),
  ];
}

/**
 * Where the latest recorded event sits among the cards, or -1 when there are
 * no recorded events. It is the first card unless a comparison event that is
 * not the latest has been put ahead of it.
 */
export function latestCardIndex(
  events: readonly FloodEvent[],
  comparisonEvent?: FloodEvent | null
): number {
  const latest = latestFloodEvent(events);
  if (!latest) return -1;
  return orderFloodEventCards(events, comparisonEvent).indexOf(latest);
}
