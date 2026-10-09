// Run with vitest (`pnpm vitest run supabase/functions`); the worker itself
// never imports this file.
import { describe, expect, it } from 'vitest';
import {
  MAX_CONSECUTIVE_UNAVAILABLE,
  MIN_REQUEST_GAP_MS,
  classifyGeocodeResponse,
  msUntilNextRequest,
  shouldStopRun,
} from './decide';

describe('classifyGeocodeResponse', () => {
  it('builds the address from a normal answer', () => {
    expect(
      classifyGeocodeResponse(200, {
        address: {
          road: 'A. Soriano Avenue',
          suburb: 'Centro',
          city: 'Mandaue',
        },
      })
    ).toEqual({
      kind: 'address',
      address: 'A. Soriano Avenue, Centro, Mandaue, Cebu, Philippines',
    });
  });

  it('falls back to the neighbourhood and the default city', () => {
    expect(
      classifyGeocodeResponse(200, { address: { neighbourhood: 'Tipolo' } })
    ).toEqual({
      kind: 'address',
      address: 'Tipolo, Mandaue City, Cebu, Philippines',
    });
  });

  it('ignores address fields that are not text', () => {
    expect(
      classifyGeocodeResponse(200, { address: { road: 7, city: '  ' } })
    ).toEqual({
      kind: 'address',
      address: 'Mandaue City, Cebu, Philippines',
    });
  });

  it('treats "nothing here" as a permanent failure', () => {
    expect(
      classifyGeocodeResponse(200, { error: 'Unable to geocode' })
    ).toEqual({ kind: 'no_result' });
    expect(classifyGeocodeResponse(200, {})).toEqual({ kind: 'no_result' });
    expect(classifyGeocodeResponse(200, { address: null })).toEqual({
      kind: 'no_result',
    });
  });

  it('treats a refused request as a permanent failure', () => {
    for (const status of [400, 404, 422]) {
      expect(classifyGeocodeResponse(status), String(status)).toEqual({
        kind: 'no_result',
      });
    }
  });

  it('leaves the report pending when the service could not be asked', () => {
    expect(classifyGeocodeResponse(null)).toEqual({ kind: 'unavailable' });
    for (const status of [403, 408, 429, 500, 502, 503, 504]) {
      expect(classifyGeocodeResponse(status), String(status)).toEqual({
        kind: 'unavailable',
      });
    }
  });

  it('does not trust the body of a failed response', () => {
    expect(
      classifyGeocodeResponse(503, { address: { road: 'A road' } })
    ).toEqual({ kind: 'unavailable' });
  });

  it('leaves the report pending when a 200 is not an answer', () => {
    for (const body of [undefined, null, 'Bad gateway', [], 42]) {
      expect(classifyGeocodeResponse(200, body)).toEqual({
        kind: 'unavailable',
      });
    }
  });
});

describe('msUntilNextRequest', () => {
  it('does not wait before the first request', () => {
    expect(msUntilNextRequest(null, 5_000)).toBe(0);
  });

  it('waits out the rest of the gap', () => {
    expect(msUntilNextRequest(5_000, 5_000)).toBe(MIN_REQUEST_GAP_MS);
    expect(msUntilNextRequest(5_000, 5_400)).toBe(MIN_REQUEST_GAP_MS - 400);
  });

  it('does not wait once the gap has passed', () => {
    expect(msUntilNextRequest(5_000, 5_000 + MIN_REQUEST_GAP_MS)).toBe(0);
    expect(msUntilNextRequest(5_000, 60_000)).toBe(0);
  });

  it('waits one gap, no more, if the clock went backwards', () => {
    expect(msUntilNextRequest(5_000, 1_000)).toBe(MIN_REQUEST_GAP_MS);
  });
});

describe('shouldStopRun', () => {
  it('stops after a few unavailable answers in a row', () => {
    expect(shouldStopRun(0)).toBe(false);
    expect(shouldStopRun(MAX_CONSECUTIVE_UNAVAILABLE - 1)).toBe(false);
    expect(shouldStopRun(MAX_CONSECUTIVE_UNAVAILABLE)).toBe(true);
    expect(shouldStopRun(MAX_CONSECUTIVE_UNAVAILABLE + 1)).toBe(true);
  });
});
