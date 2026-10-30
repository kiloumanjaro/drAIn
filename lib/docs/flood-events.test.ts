import { describe, expect, it } from 'vitest';
import {
  latestCardIndex,
  latestFloodEvent,
  orderFloodEventCards,
  parseFloodEvents,
  stripPrefix,
} from './flood-events';

const event = (eventName: string) => ({
  eventName,
  summary: 'Heavy rain flooded low-lying roads.',
  data: { 'Affected Areas': 'Brgy. Tipolo' },
});

const OLDEST = event('Event 1: Flash Flood of July 1, 2016');
const MIDDLE = event('Event 9: Flash Flood of August 15, 2025');
const NEWEST = event('Event 10: Typhoon Tino (Kalmaegi) of November 4, 2025');
const EVENTS = [OLDEST, MIDDLE, NEWEST];

describe('parseFloodEvents', () => {
  it('reads the events of a well-formed body', () => {
    expect(
      parseFloodEvents({ reportTitle: 'Flood reports', events: EVENTS })
    ).toEqual(EVENTS);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'events'],
    ['an array', EVENTS],
    ['an object with no events', { reportTitle: 'Flood reports' }],
    ['events that are not a list', { events: { 0: OLDEST } }],
    ['an error body', { error: 'Failed to load flood reports' }],
  ])('gives no events for %s', (_label, body) => {
    expect(parseFloodEvents(body)).toEqual([]);
  });

  it('leaves out entries that are not flood events', () => {
    expect(
      parseFloodEvents({
        events: [OLDEST, null, { eventName: 'No summary' }, NEWEST],
      })
    ).toEqual([OLDEST, NEWEST]);
  });
});

describe('latestFloodEvent', () => {
  it('is the last event of the list', () => {
    expect(latestFloodEvent(EVENTS)).toBe(NEWEST);
    expect(latestFloodEvent([OLDEST])).toBe(OLDEST);
  });

  it('is null when there are no events', () => {
    expect(latestFloodEvent([])).toBeNull();
  });
});

describe('stripPrefix', () => {
  it.each([
    ['Event 1: Flash Flood of July 1, 2016', 'Flash Flood of July 1, 2016'],
    [
      'Event 10: Typhoon Tino (Kalmaegi) of November 4, 2025',
      'Typhoon Tino (Kalmaegi) of November 4, 2025',
    ],
    ['NEW EVENT: Flash Flood of Nov 14, 2025', 'Flash Flood of Nov 14, 2025'],
    ['new event:Flash Flood', 'Flash Flood'],
    ['Flash Flood of July 1, 2016', 'Flash Flood of July 1, 2016'],
    ['Flood, Event 2: the sequel', 'Flood, Event 2: the sequel'],
  ])('turns %j into %j', (name, expected) => {
    expect(stripPrefix(name)).toBe(expected);
  });
});

describe('orderFloodEventCards', () => {
  it('lists the events newest first', () => {
    expect(orderFloodEventCards(EVENTS)).toEqual([NEWEST, MIDDLE, OLDEST]);
    expect(orderFloodEventCards(EVENTS, null)).toEqual([
      NEWEST,
      MIDDLE,
      OLDEST,
    ]);
  });

  it('does not reorder the list it was given', () => {
    const events = [...EVENTS];
    orderFloodEventCards(events);
    expect(events).toEqual(EVENTS);
  });

  it('puts the comparison event ahead of the rest', () => {
    const comparison = event('NEW EVENT: Flash Flood of Nov 14, 2025');
    expect(orderFloodEventCards(EVENTS, comparison)).toEqual([
      comparison,
      NEWEST,
      MIDDLE,
      OLDEST,
    ]);
  });

  it('shows an event once when the comparison event repeats it', () => {
    const result = orderFloodEventCards(EVENTS, { ...MIDDLE });
    expect(result).toEqual([MIDDLE, NEWEST, OLDEST]);
    expect(result[0]).toBe(MIDDLE);
  });

  it('matches a repeated event whatever its prefix, and keeps the recorded content', () => {
    const comparison = {
      ...event('NEW EVENT: Flash Flood of August 15, 2025'),
      summary: 'Text from the link, not from the record.',
      data: { 'Affected Areas': 'Nowhere' },
    };
    const result = orderFloodEventCards(EVENTS, comparison);
    expect(result).toEqual([MIDDLE, NEWEST, OLDEST]);
    expect(result[0]).toBe(MIDDLE);
    expect(result).not.toContain(comparison);
  });

  it('shows the comparison event alone when there are no others', () => {
    expect(orderFloodEventCards([], NEWEST)).toEqual([NEWEST]);
    expect(orderFloodEventCards([])).toEqual([]);
  });
});

describe('latestCardIndex', () => {
  it('is the first card when there is no comparison event', () => {
    expect(latestCardIndex(EVENTS)).toBe(0);
    expect(latestCardIndex(EVENTS, null)).toBe(0);
  });

  it('is the first card when the comparison event is the latest', () => {
    expect(latestCardIndex(EVENTS, { ...NEWEST })).toBe(0);
    expect(
      latestCardIndex(
        EVENTS,
        event('NEW EVENT: Typhoon Tino (Kalmaegi) of November 4, 2025')
      )
    ).toBe(0);
  });

  it('is the second card when an older event is the comparison', () => {
    expect(latestCardIndex(EVENTS, { ...OLDEST })).toBe(1);
  });

  it('is the second card when the comparison event is not on record', () => {
    expect(
      latestCardIndex(EVENTS, event('NEW EVENT: Flash Flood of Nov 14, 2025'))
    ).toBe(1);
  });

  it('is -1 when there are no recorded events', () => {
    expect(latestCardIndex([], NEWEST)).toBe(-1);
    expect(latestCardIndex([])).toBe(-1);
  });
});
