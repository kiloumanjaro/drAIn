import { describe, expect, it } from 'vitest';
import { isNearLimit } from './char-count';

describe('isNearLimit', () => {
  it('stays quiet for ordinary lengths', () => {
    expect(isNearLimit(0, 1000)).toBe(false);
    expect(isNearLimit(899, 1000)).toBe(false);
  });

  it('starts at 90% of the limit and holds to the limit', () => {
    expect(isNearLimit(900, 1000)).toBe(true);
    expect(isNearLimit(1000, 1000)).toBe(true);
    expect(isNearLimit(90, 100)).toBe(true);
    expect(isNearLimit(89, 100)).toBe(false);
  });

  it('shows nothing when there is no limit', () => {
    expect(isNearLimit(0, 0)).toBe(false);
  });
});
