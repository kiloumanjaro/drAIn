import { describe, expect, it } from 'vitest';

import { compareTableValues } from './compare-values';

const sortBy = (values: unknown[], direction: 'asc' | 'desc') =>
  [...values].sort((a, b) => compareTableValues(a, b, direction));

describe('compareTableValues', () => {
  it('sorts numbers numerically both ways', () => {
    expect(sortBy([10, 2, 33], 'asc')).toEqual([2, 10, 33]);
    expect(sortBy([10, 2, 33], 'desc')).toEqual([33, 10, 2]);
  });

  it('sorts text both ways', () => {
    expect(sortBy(['b', 'a', 'c'], 'asc')).toEqual(['a', 'b', 'c']);
    expect(sortBy(['b', 'a', 'c'], 'desc')).toEqual(['c', 'b', 'a']);
  });

  it('reads the numbers in node ids as numbers', () => {
    // As plain text they came out I-0, I-1, I-10, I-100, I-2.
    const ids = ['I-10', 'I-2', 'I-100', 'I-0', 'ISD-3', 'I-1'];
    expect(sortBy(ids, 'asc')).toEqual([
      'I-0',
      'I-1',
      'I-2',
      'I-10',
      'I-100',
      'ISD-3',
    ]);
    expect(sortBy(ids, 'desc')).toEqual([
      'ISD-3',
      'I-100',
      'I-10',
      'I-2',
      'I-1',
      'I-0',
    ]);
  });

  it.each(['asc', 'desc'] as const)(
    'puts empty cells last when sorting %s',
    (direction) => {
      // "Minutes to overflow" is null for every node that never overflowed.
      // The comparator used to call any pair involving null equal, which
      // is not a consistent ordering: the blanks stayed wherever they were
      // and the numbers around them were only partly sorted.
      const sorted = sortBy([null, 30, undefined, 5, NaN, 12], direction);
      expect(sorted.slice(0, 3)).toEqual(
        direction === 'asc' ? [5, 12, 30] : [30, 12, 5]
      );
      expect(sorted.slice(3).every((v) => v == null || Number.isNaN(v))).toBe(
        true
      );
    }
  );

  it('treats two empty cells as equal', () => {
    expect(compareTableValues(null, undefined, 'asc')).toBe(0);
  });
});
