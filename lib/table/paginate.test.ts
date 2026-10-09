import { describe, expect, it } from 'vitest';
import { pageLabel, paginate } from './paginate';

describe('paginate', () => {
  it('gives the first hundred of the 1,369 result rows', () => {
    expect(paginate(1369, 100, 1)).toEqual({
      page: 1,
      pageCount: 14,
      start: 0,
      end: 100,
    });
  });

  it('ends the last page where the rows end', () => {
    expect(paginate(1369, 100, 14)).toEqual({
      page: 14,
      pageCount: 14,
      start: 1300,
      end: 1369,
    });
  });

  it('does not add an empty page when the rows fill the last one', () => {
    expect(paginate(200, 100, 2)).toMatchObject({ pageCount: 2, end: 200 });
    expect(paginate(200, 100, 3).page).toBe(2);
  });

  it('shows the last page when the list has shrunk under the wanted one', () => {
    // On page 9, then a search leaves 120 rows.
    expect(paginate(120, 50, 9)).toEqual({
      page: 3,
      pageCount: 3,
      start: 100,
      end: 120,
    });
  });

  it('shows the first page for a page before it, or one that is no number', () => {
    expect(paginate(500, 50, 0).page).toBe(1);
    expect(paginate(500, 50, -3).page).toBe(1);
    expect(paginate(500, 50, Number.NaN).page).toBe(1);
  });

  it('gives an empty table one empty page', () => {
    expect(paginate(0, 50, 1)).toEqual({
      page: 1,
      pageCount: 1,
      start: 0,
      end: 0,
    });
  });

  it('never divides by a page size of nothing', () => {
    expect(paginate(3, 0, 2)).toEqual({
      page: 2,
      pageCount: 3,
      start: 1,
      end: 2,
    });
  });

  it('covers every row exactly once across its pages', () => {
    const seen: number[] = [];
    const { pageCount } = paginate(1232, 50, 1);
    for (let page = 1; page <= pageCount; page++) {
      const { start, end } = paginate(1232, 50, page);
      for (let row = start; row < end; row++) seen.push(row);
    }
    expect(seen).toEqual(Array.from({ length: 1232 }, (_, row) => row));
  });
});

describe('pageLabel', () => {
  it('names the rows on the page, counted from 1', () => {
    expect(pageLabel(paginate(1369, 100, 1), 1369)).toBe('1–100 of 1,369');
    expect(pageLabel(paginate(1369, 100, 14), 1369)).toBe(
      '1,301–1,369 of 1,369'
    );
  });

  it('names a single row once', () => {
    expect(pageLabel(paginate(101, 100, 2), 101)).toBe('101 of 101');
  });

  it('says there is nothing in an empty table', () => {
    expect(pageLabel(paginate(0, 100, 1), 0)).toBe('0 of 0');
  });
});
