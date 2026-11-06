/**
 * The flood-hazard tile manifest, written by scripts/build-flood-tiles.mjs
 * on every build: one entry per return-period scenario, with the hashed
 * tile URL template the map's vector source reads.
 */
export interface FloodHazardScenario {
  /** `/flood-hazard/<hash>/<ID>/{z}/{x}/{y}.pbf` */
  tiles: string;
  minzoom: number;
  maxzoom: number;
  /** [west, south, east, north] */
  bounds: [number, number, number, number];
  /** Feature count after merging neighbouring cells. */
  features: number;
}

export interface FloodHazardManifest {
  version: number;
  scenarios: Record<string, FloodHazardScenario>;
}

export const FLOOD_HAZARD_MANIFEST_URL = '/flood-hazard/manifest.json';

/** No scenarios: what the map uses when the manifest cannot be read. */
export const EMPTY_FLOOD_HAZARD_MANIFEST: FloodHazardManifest = {
  version: 1,
  scenarios: {},
};

let cached: Promise<FloodHazardManifest> | null = null;

/**
 * Fetch the manifest once per page load; every caller shares the promise.
 * Rejects on a response that is not a manifest, and forgets a failed fetch
 * so the next caller tries again.
 */
export function loadFloodHazardManifest(
  fetcher: typeof fetch = fetch
): Promise<FloodHazardManifest> {
  if (!cached) {
    cached = fetcher(FLOOD_HAZARD_MANIFEST_URL)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`flood-hazard manifest: HTTP ${response.status}`);
        }
        const body: unknown = await response.json();
        if (!isManifest(body)) {
          throw new Error('flood-hazard manifest: no scenarios');
        }
        return body;
      })
      .catch((error: unknown) => {
        cached = null;
        throw error;
      });
  }
  return cached;
}

function isManifest(value: unknown): value is FloodHazardManifest {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as FloodHazardManifest).scenarios === 'object' &&
    (value as FloodHazardManifest).scenarios !== null
  );
}

/** Test seam: forget the cached manifest. */
export function resetFloodHazardManifestCache(): void {
  cached = null;
}
