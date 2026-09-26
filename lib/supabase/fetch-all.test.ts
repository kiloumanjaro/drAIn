import { describe, expect, it, vi } from 'vitest';

import { fetchAllRows, PAGE_SIZE } from './fetch-all';

const rows = (n: number, start = 0) =>
  Array.from({ length: n }, (_, i) => ({ id: start + i }));

describe('fetchAllRows', () => {
  it('keeps asking until a page comes back short', async () => {
    // A plain select stops at the API's row limit without saying so.
    const total = PAGE_SIZE * 2 + 5;
    const page = vi.fn(async (from: number, to: number) => ({
      data: rows(Math.max(0, Math.min(to + 1, total) - from), from),
      error: null,
    }));

    const all = await fetchAllRows(page);

    expect(all).toHaveLength(total);
    expect(page).toHaveBeenCalledTimes(3);
    expect(page).toHaveBeenNthCalledWith(2, PAGE_SIZE, PAGE_SIZE * 2 - 1);
  });

  it('asks once more when the last page is exactly full', async () => {
    const page = vi.fn(async (from: number) => ({
      data: from === 0 ? rows(PAGE_SIZE) : [],
      error: null,
    }));

    await expect(fetchAllRows(page)).resolves.toHaveLength(PAGE_SIZE);
    expect(page).toHaveBeenCalledTimes(2);
  });

  it('throws the query error', async () => {
    const error = { message: 'boom', details: '', hint: '', code: 'XX000' };
    await expect(
      fetchAllRows(async () => ({ data: null, error: error as never }))
    ).rejects.toBe(error);
  });
});
