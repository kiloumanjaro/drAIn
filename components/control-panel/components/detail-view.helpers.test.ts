import { describe, expect, it } from 'vitest';
import { activeTimelineIndex, isAtScrollEnd } from './detail-view.helpers';

describe('isAtScrollEnd', () => {
  it('is false part way down', () => {
    expect(
      isAtScrollEnd({ scrollTop: 100, clientHeight: 400, scrollHeight: 1200 })
    ).toBe(false);
  });

  it('is true at the bottom', () => {
    expect(
      isAtScrollEnd({ scrollTop: 800, clientHeight: 400, scrollHeight: 1200 })
    ).toBe(true);
  });

  it('allows for a fractional scroll position', () => {
    expect(
      isAtScrollEnd({ scrollTop: 798.6, clientHeight: 400, scrollHeight: 1200 })
    ).toBe(true);
  });

  it('is true when the content fits without scrolling', () => {
    expect(
      isAtScrollEnd({ scrollTop: 0, clientHeight: 400, scrollHeight: 400 })
    ).toBe(true);
  });
});

describe('activeTimelineIndex', () => {
  it('follows the card in view while there is more to scroll', () => {
    expect(activeTimelineIndex(2, false, 8)).toBe(2);
  });

  it('is the last card once the scroll reaches the end', () => {
    expect(activeTimelineIndex(4, true, 8)).toBe(7);
  });

  it('has no active card before one has been in view', () => {
    expect(activeTimelineIndex(-1, false, 8)).toBe(-1);
  });

  it('stays inside a list that became shorter', () => {
    expect(activeTimelineIndex(7, false, 5)).toBe(4);
  });

  it('has no active card when there are none', () => {
    expect(activeTimelineIndex(-1, true, 0)).toBe(-1);
  });
});
