import { describe, expect, it } from 'vitest';
import {
  diffReportBubbles,
  reportBubbleSignature,
  type BubbleState,
} from './report-bubbles';

const report = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  status: 'pending',
  description: 'Blocked inlet',
  componentId: `I-${id}`,
  category: 'inlets',
  coordinates: [123.9, 10.3],
  ...overrides,
});

/** The bubble a report would be drawn as. */
const state = (
  id: string,
  count = 1,
  overrides?: Record<string, unknown>
): BubbleState => ({
  id,
  signature: reportBubbleSignature(report(id, overrides), count),
});

/** The bubbles on the map after drawing these. */
const drawn = (...states: BubbleState[]) =>
  new Map(states.map(({ id, signature }) => [id, signature]));

describe('reportBubbleSignature', () => {
  it('is the same for the same report and count', () => {
    expect(reportBubbleSignature(report('a'), 2)).toBe(
      reportBubbleSignature(report('a'), 2)
    );
  });

  it('changes when anything about the report changes', () => {
    const before = reportBubbleSignature(report('a'), 2);
    expect(
      reportBubbleSignature(report('a', { status: 'resolved' }), 2)
    ).not.toBe(before);
    expect(
      reportBubbleSignature(report('a', { coordinates: [123.9, 10.4] }), 2)
    ).not.toBe(before);
  });

  it('changes when the count changes', () => {
    expect(reportBubbleSignature(report('a'), 2)).not.toBe(
      reportBubbleSignature(report('a'), 3)
    );
  });

  it('keeps a count and a report that share digits apart', () => {
    expect(reportBubbleSignature({ n: 1 }, 12)).not.toBe(
      reportBubbleSignature({ n: 21 }, 1)
    );
  });
});

describe('diffReportBubbles', () => {
  it('adds every report when the map has no bubbles', () => {
    expect(diffReportBubbles(new Map(), [state('a'), state('b')])).toEqual({
      add: ['a', 'b'],
      remove: [],
      update: [],
    });
  });

  it('does nothing when nothing changed', () => {
    const states = [state('a'), state('b')];
    expect(diffReportBubbles(drawn(...states), states)).toEqual({
      add: [],
      remove: [],
      update: [],
    });
  });

  it('does nothing when the same reports arrive in another order', () => {
    expect(
      diffReportBubbles(drawn(state('a'), state('b')), [state('b'), state('a')])
    ).toEqual({ add: [], remove: [], update: [] });
  });

  it('adds only the new report when one arrives', () => {
    expect(
      diffReportBubbles(drawn(state('a'), state('b')), [
        state('c'),
        state('a'),
        state('b'),
      ])
    ).toEqual({ add: ['c'], remove: [], update: [] });
  });

  it('removes a bubble whose report is gone', () => {
    expect(
      diffReportBubbles(drawn(state('a'), state('b')), [state('b')])
    ).toEqual({ add: [], remove: ['a'], update: [] });
  });

  it('swaps the bubble when a component gets a newer report', () => {
    // The latest-per-component list replaces the old report with the new.
    expect(
      diffReportBubbles(drawn(state('old'), state('b')), [
        state('new'),
        state('b'),
      ])
    ).toEqual({ add: ['new'], remove: ['old'], update: [] });
  });

  it('redraws only the bubble whose report changed', () => {
    expect(
      diffReportBubbles(drawn(state('a'), state('b')), [
        state('a', 1, { status: 'resolved' }),
        state('b'),
      ])
    ).toEqual({ add: [], remove: [], update: ['a'] });
  });

  it('redraws only the bubble whose count changed', () => {
    expect(
      diffReportBubbles(drawn(state('a', 1), state('b', 4)), [
        state('a', 1),
        state('b', 5),
      ])
    ).toEqual({ add: [], remove: [], update: ['b'] });
  });

  it('removes everything when there are no reports', () => {
    expect(diffReportBubbles(drawn(state('a'), state('b')), [])).toEqual({
      add: [],
      remove: ['a', 'b'],
      update: [],
    });
  });

  it('handles an add, a removal and an update together', () => {
    expect(
      diffReportBubbles(drawn(state('a'), state('b'), state('c')), [
        state('b', 2),
        state('c'),
        state('d'),
      ])
    ).toEqual({ add: ['d'], remove: ['a'], update: ['b'] });
  });

  it('counts a report listed twice once, as first listed', () => {
    expect(
      diffReportBubbles(new Map(), [state('a', 1), state('a', 2)])
    ).toEqual({ add: ['a'], remove: [], update: [] });
    expect(
      diffReportBubbles(drawn(state('a', 1)), [state('a', 1), state('a', 2)])
    ).toEqual({ add: [], remove: [], update: [] });
  });

  it('does not change what it was given', () => {
    const previous = drawn(state('a'), state('b'));
    const next = [state('b', 3), state('c')];
    const previousCopy = new Map(previous);
    const nextCopy = structuredClone(next);

    diffReportBubbles(previous, next);

    expect(previous).toEqual(previousCopy);
    expect(next).toEqual(nextCopy);
  });
});
