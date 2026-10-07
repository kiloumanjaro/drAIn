import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchYRTable = vi.hoisted(() => vi.fn());

vi.mock('./fetch-yr-table', () => ({ fetchYRTable }));

import {
  STORED_TABLE_MIN_LOADING_MS,
  paramsById,
  storedTableQuery,
  withMinimumDuration,
} from './stored-table';

describe('storedTableQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    fetchYRTable.mockReset();
    // The app's client retries once by default; these options must not.
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: 1, staleTime: 0 } },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('keys each return period separately', () => {
    expect(storedTableQuery(5).queryKey).not.toEqual(
      storedTableQuery(25).queryKey
    );
    expect(storedTableQuery(5).queryKey).toEqual(storedTableQuery(5).queryKey);
  });

  it('fetches a return period once, however often it is asked for', async () => {
    const rows = [{ Node_ID: 'I-1' }];
    fetchYRTable.mockResolvedValue(rows);

    const first = await queryClient.fetchQuery(storedTableQuery(10));
    const second = await queryClient.fetchQuery(storedTableQuery(10));

    expect(fetchYRTable.mock.calls).toEqual([[10]]);
    expect(first).toBe(rows);
    expect(second).toBe(rows);
  });

  it('fetches a different return period separately', async () => {
    fetchYRTable.mockImplementation(async (year: number) => [{ YR: year }]);

    await queryClient.fetchQuery(storedTableQuery(10));
    const other = await queryClient.fetchQuery(storedTableQuery(50));

    expect(fetchYRTable.mock.calls).toEqual([[10], [50]]);
    expect(other).toEqual([{ YR: 50 }]);
  });

  it('reports a failure without retrying, and fetches again next time', async () => {
    fetchYRTable.mockRejectedValueOnce(new Error('offline'));
    await expect(queryClient.fetchQuery(storedTableQuery(10))).rejects.toThrow(
      'offline'
    );
    expect(fetchYRTable).toHaveBeenCalledTimes(1);

    fetchYRTable.mockResolvedValue([]);
    await expect(queryClient.fetchQuery(storedTableQuery(10))).resolves.toEqual(
      []
    );
    expect(fetchYRTable).toHaveBeenCalledTimes(2);
  });
});

describe('withMinimumDuration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('holds back a value that arrives early', async () => {
    const settled = vi.fn();
    withMinimumDuration(Promise.resolve('rows'), 400).then(settled);

    await vi.advanceTimersByTimeAsync(399);
    expect(settled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(settled.mock.calls).toEqual([['rows']]);
  });

  it('adds nothing to a value that arrives late', async () => {
    const settled = vi.fn();
    const slow = new Promise<string>((resolve) =>
      setTimeout(() => resolve('rows'), 1000)
    );
    withMinimumDuration(slow, 400).then(settled);

    await vi.advanceTimersByTimeAsync(999);
    expect(settled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(settled.mock.calls).toEqual([['rows']]);
  });

  it('passes a failure on', async () => {
    const failed = withMinimumDuration(
      Promise.reject(new Error('offline')),
      400
    );
    await expect(failed).rejects.toThrow('offline');
  });

  it('keeps the stored table from flashing without making it slow', () => {
    expect(STORED_TABLE_MIN_LOADING_MS).toBeGreaterThanOrEqual(300);
    expect(STORED_TABLE_MIN_LOADING_MS).toBeLessThanOrEqual(500);
  });
});

describe('paramsById', () => {
  it('turns the parameter map into the object the API takes', () => {
    const params = new Map([
      ['I-1', { init_depth: 1 }],
      ['I-2', { init_depth: 2 }],
    ]);
    expect(paramsById(params)).toEqual({
      'I-1': { init_depth: 1 },
      'I-2': { init_depth: 2 },
    });
  });

  it('gives an empty object for no parameters', () => {
    expect(paramsById(new Map())).toEqual({});
  });
});
