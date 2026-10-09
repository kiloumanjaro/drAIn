import { describe, expect, it } from 'vitest';
import {
  isFloodEvent,
  parseCompareEventParam,
  parseSectionParam,
} from './docs-params';

const IDS = ['overview', 'reports', 'tech-stack'] as const;

const EVENT = {
  eventName: 'NEW EVENT: Flash Flood of Nov 14, 2025',
  summary: 'Rainfall was 100% above the monthly average.',
  data: { Time: '4:30 PM', 'Estimated Rainfall': '30mm in 1 hour' },
};

describe('parseSectionParam', () => {
  it.each(IDS)('accepts the known section "%s"', (id) => {
    expect(parseSectionParam(id, IDS, 'overview')).toBe(id);
  });

  it.each([null, undefined, '', 'nope', 'Reports', 'reports ', '__proto__'])(
    'falls back for %j',
    (param) => {
      expect(parseSectionParam(param, IDS, 'overview')).toBe('overview');
    }
  );
});

describe('isFloodEvent', () => {
  it('accepts a well-formed event', () => {
    expect(isFloodEvent(EVENT)).toBe(true);
    expect(isFloodEvent({ ...EVENT, data: {} })).toBe(true);
  });

  it.each([
    ['null', null],
    ['a string', 'event'],
    ['a number', 3],
    ['an array', []],
    ['an empty object', {}],
    ['a missing name', { summary: '', data: {} }],
    ['a name that is not text', { ...EVENT, eventName: 1 }],
    ['a missing summary', { eventName: '', data: {} }],
    ['a summary that is an object', { ...EVENT, summary: {} }],
    ['missing data', { eventName: '', summary: '' }],
    ['null data', { ...EVENT, data: null }],
    ['data that is an array', { ...EVENT, data: ['a'] }],
    ['a data value that is an object', { ...EVENT, data: { Time: {} } }],
    ['a data value that is a number', { ...EVENT, data: { Time: 4 } }],
  ])('rejects %s', (_label, value) => {
    expect(isFloodEvent(value)).toBe(false);
  });
});

describe('parseCompareEventParam', () => {
  it('returns null when there is no parameter', () => {
    expect(parseCompareEventParam(null)).toBeNull();
    expect(parseCompareEventParam(undefined)).toBeNull();
    expect(parseCompareEventParam('')).toBeNull();
  });

  it('returns null for text that is not JSON', () => {
    expect(parseCompareEventParam('not json')).toBeNull();
    expect(parseCompareEventParam('{')).toBeNull();
  });

  it.each(['{}', '[]', 'null', '"text"', '{"eventName":"x"}'])(
    'returns null for JSON of the wrong shape: %s',
    (param) => {
      expect(parseCompareEventParam(param)).toBeNull();
    }
  );

  it('reads the link the map widget builds', () => {
    // widget-trigger.tsx encodes once; searchParams.get decodes once.
    const href = `/docs?section=reports&compareEvent=${encodeURIComponent(
      JSON.stringify(EVENT)
    )}`;
    const param = new URL(href, 'http://localhost').searchParams.get(
      'compareEvent'
    );
    expect(parseCompareEventParam(param)).toEqual(EVENT);
  });

  it('keeps a literal "%" instead of decoding a second time', () => {
    const event = { ...EVENT, summary: '50% of roads, 100%25 sure' };
    expect(parseCompareEventParam(JSON.stringify(event))).toEqual(event);
  });
});
