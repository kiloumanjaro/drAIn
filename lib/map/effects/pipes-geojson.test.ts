import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PIPES_GEOJSON_URL,
  loadPipesGeoJSON,
  resetPipesGeoJSONCache,
} from './pipes-geojson';

const PIPES: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { Name: 'P1' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [0, 0],
          [0.01, 0],
        ],
      },
    },
  ],
};

const ok = (body: unknown) => ({
  ok: true,
  status: 200,
  json: async () => body,
});

describe('loadPipesGeoJSON', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    resetPipesGeoJSONCache();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches the pipes file and returns its contents', async () => {
    fetchMock.mockResolvedValue(ok(PIPES));
    await expect(loadPipesGeoJSON()).resolves.toEqual(PIPES);
    expect(fetchMock.mock.calls).toEqual([[PIPES_GEOJSON_URL]]);
  });

  it('fetches once for callers that ask at the same time', async () => {
    fetchMock.mockResolvedValue(ok(PIPES));
    const [a, b] = await Promise.all([loadPipesGeoJSON(), loadPipesGeoJSON()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it('does not fetch again once loaded', async () => {
    fetchMock.mockResolvedValue(ok(PIPES));
    const first = await loadPipesGeoJSON();
    const second = await loadPipesGeoJSON();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it('tries again after the network fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await expect(loadPipesGeoJSON()).rejects.toThrow('offline');

    fetchMock.mockResolvedValue(ok(PIPES));
    await expect(loadPipesGeoJSON()).resolves.toEqual(PIPES);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('treats an error response as a failure and tries again', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ message: 'unavailable' }),
    });
    await expect(loadPipesGeoJSON()).rejects.toThrow('503');

    fetchMock.mockResolvedValue(ok(PIPES));
    await expect(loadPipesGeoJSON()).resolves.toEqual(PIPES);
  });

  it('tries again after a response that is not JSON', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    });
    await expect(loadPipesGeoJSON()).rejects.toThrow(SyntaxError);

    fetchMock.mockResolvedValue(ok(PIPES));
    await expect(loadPipesGeoJSON()).resolves.toEqual(PIPES);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives every waiting caller the same failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    const results = await Promise.allSettled([
      loadPipesGeoJSON(),
      loadPipesGeoJSON(),
    ]);
    expect(results.map((result) => result.status)).toEqual([
      'rejected',
      'rejected',
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fetches again after a reset', async () => {
    fetchMock.mockResolvedValue(ok(PIPES));
    await loadPipesGeoJSON();
    resetPipesGeoJSONCache();
    await loadPipesGeoJSON();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
