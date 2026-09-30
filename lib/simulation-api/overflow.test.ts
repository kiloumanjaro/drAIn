import { describe, expect, it } from 'vitest';

import { normaliseOverflowMinutes } from './overflow';

describe('normaliseOverflowMinutes', () => {
  it('turns the 9999 sentinel into null', () => {
    expect(normaliseOverflowMinutes(9999)).toBeNull();
  });

  it.each([[0], [12.5], [120], [9998]])('keeps a real time of %s', (value) => {
    expect(normaliseOverflowMinutes(value)).toBe(value);
  });

  it.each([[null], [undefined], [NaN], [Infinity]])(
    'treats %s as never overflowed',
    (value) => {
      expect(normaliseOverflowMinutes(value)).toBeNull();
    }
  );
});
