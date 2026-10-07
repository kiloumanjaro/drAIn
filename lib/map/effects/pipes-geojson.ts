export const PIPES_GEOJSON_URL = '/drainage/man_pipes.geojson';

let cached: Promise<GeoJSON.FeatureCollection> | null = null;

/**
 * The pipe network's GeoJSON, fetched once and shared.
 *
 * A simulation result draws the pipes twice (the flood lines and the
 * heatmap), and the file does not change while the page is open. Callers get
 * the same object, so they must not change it.
 *
 * A failed load is not kept: the next call tries again.
 */
export function loadPipesGeoJSON(): Promise<GeoJSON.FeatureCollection> {
  if (cached) return cached;

  const request = fetch(PIPES_GEOJSON_URL).then((response) => {
    if (!response.ok) {
      throw new Error(`Could not load the pipes (HTTP ${response.status})`);
    }
    return response.json() as Promise<GeoJSON.FeatureCollection>;
  });
  cached = request;
  request.catch(() => {
    if (cached === request) cached = null;
  });
  return request;
}

/** Forget the loaded pipes. For tests. */
export function resetPipesGeoJSONCache(): void {
  cached = null;
}
