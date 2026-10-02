import { afterEach, describe, expect, it, vi } from 'vitest';
import { getClosestPipes } from './get-closest-pipe';

// A minimal fetch stub: the function's own logic (payload shape, error
// unwrapping) is what is under test, not the network.
function stubFetch(response: {
  ok: boolean;
  json: () => Promise<unknown>;
}): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getClosestPipes', () => {
  it('posts the location and category and returns the results array', async () => {
    const results = [{ name: 'P-1', lat: 10.3, long: 123.9, distance: 12 }];
    const fetchMock = stubFetch({
      ok: true,
      json: async () => ({ success: true, count: 1, results }),
    });

    const pipes = await getClosestPipes({ lat: 10.3, lon: 123.9 }, 'man_pipes');

    expect(pipes).toEqual(results);
    expect(fetchMock).toHaveBeenCalledWith('/api/closest-pipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: { lat: 10.3, lon: 123.9 },
        category: 'man_pipes',
      }),
    });
  });

  it('surfaces the server error message on a failed response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    stubFetch({
      ok: false,
      json: async () => ({ error: 'category not recognised' }),
    });

    await expect(getClosestPipes({ lat: 0, lon: 0 }, 'bogus')).rejects.toThrow(
      'category not recognised'
    );
  });

  it('falls back to a generic message when the error body is empty', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    stubFetch({ ok: false, json: async () => ({}) });

    await expect(getClosestPipes({ lat: 0, lon: 0 }, 'inlets')).rejects.toThrow(
      'Failed to fetch closest pipes'
    );
  });
});
