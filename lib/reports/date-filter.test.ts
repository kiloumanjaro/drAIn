import { describe, expect, it } from 'vitest';
import { dateFilterCutoff } from './date-filter';

describe('dateFilterCutoff', () => {
  const now = new Date(2026, 8, 29, 15, 30);

  it('keeps everything for "all"', () => {
    expect(dateFilterCutoff('all', now)).toBeNull();
  });

  it('starts "today" at local midnight', () => {
    expect(dateFilterCutoff('today', now)).toEqual(new Date(2026, 8, 29));
  });

  it('counts weeks and months back from now', () => {
    expect(dateFilterCutoff('week', now)).toEqual(
      new Date(2026, 8, 22, 15, 30)
    );
    expect(dateFilterCutoff('3weeks', now)).toEqual(
      new Date(2026, 8, 8, 15, 30)
    );
    expect(dateFilterCutoff('month', now)).toEqual(
      new Date(2026, 7, 29, 15, 30)
    );
  });
});
