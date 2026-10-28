import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FLOOD_HAZARD_MANIFEST_URL,
  loadFloodHazardManifest,
  resetFloodHazardManifestCache,
} from './flood-hazard-manifest';

const manifest = {
  version: 1,
  scenarios: {
    '5YR': {
      tiles: '/flood-hazard/abc123def0/5YR/{z}/{x}/{y}.pbf',
      minzoom: 10,
      maxzoom: 14,
      bounds: [123.9, 10.3, 124.0, 10.4],
      features: 3,
    },
  },
};

function fetcher(body: unknown, ok = true) {
  return vi.fn(async () => ({
    ok,
    status: ok ? 200 : 404,
    json: async () => body,
  })) as unknown as typeof fetch;
}

beforeEach(() => {
  resetFloodHazardManifestCache();
});

describe('loadFloodHazardManifest', () => {
  it('fetches the manifest once and shares it', async () => {
    const fetch = fetcher(manifest);
    const [a, b] = await Promise.all([
      loadFloodHazardManifest(fetch),
      loadFloodHazardManifest(fetch),
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(FLOOD_HAZARD_MANIFEST_URL);
    expect(a).toBe(b);
    expect(a.scenarios['5YR'].tiles).toContain('/5YR/{z}/{x}/{y}.pbf');
  });

  it('rejects a body without scenarios', async () => {
    await expect(
      loadFloodHazardManifest(fetcher({ version: 1 }))
    ).rejects.toThrow(/no scenarios/);
  });

  it('rejects a failed response and tries again next time', async () => {
    await expect(loadFloodHazardManifest(fetcher(null, false))).rejects.toThrow(
      /HTTP 404/
    );
    const fetch = fetcher(manifest);
    await expect(loadFloodHazardManifest(fetch)).resolves.toBe(
      await loadFloodHazardManifest(fetch)
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
