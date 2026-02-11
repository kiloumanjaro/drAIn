import type { FeatureCollection } from 'geojson';
import type {
  Inlet,
  Outlet,
  Pipe,
  Drain,
} from '@/components/control-panel/types';
import { transformInlets } from '@/hooks/useInlets';
import { transformOutletGeoJSON } from '@/hooks/useOutlets';
import { transformGeoJSON as transformPipesGeoJSON } from '@/hooks/usePipes';
import { transformGeoJSON as transformDrainsGeoJSON } from '@/hooks/useDrain';

/**
 * Custom error class for GeoJSON fetch failures
 * Provides structured error information for UI display
 */
export class GeoJSONFetchError extends Error {
  constructor(
    public readonly resource: string,
    public readonly status?: number,
    message?: string
  ) {
    super(message || `Failed to fetch ${resource}`);
    this.name = 'GeoJSONFetchError';
  }
}

/**
 * Fetch GeoJSON with proper error handling
 */
async function fetchGeoJSON(path: string): Promise<FeatureCollection> {
  const response = await fetch(path);

  if (!response.ok) {
    throw new GeoJSONFetchError(
      path,
      response.status,
      `HTTP ${response.status}: ${response.statusText}`
    );
  }

  try {
    return await response.json();
  } catch (error) {
    throw new GeoJSONFetchError(path, response.status, 'Invalid JSON response');
  }
}

/**
 * Query function to fetch and transform inlets
 */
export async function getInlets(): Promise<Inlet[]> {
  const geojson = await fetchGeoJSON('/drainage/inlets.geojson');
  return transformInlets(geojson);
}

/**
 * Query function to fetch and transform outlets
 */
export async function getOutlets(): Promise<Outlet[]> {
  const geojson = await fetchGeoJSON('/drainage/outlets.geojson');
  return transformOutletGeoJSON(geojson);
}

/**
 * Query function to fetch and transform pipes
 */
export async function getPipes(): Promise<Pipe[]> {
  const geojson = await fetchGeoJSON('/drainage/man_pipes.geojson');
  return transformPipesGeoJSON(geojson);
}

/**
 * Query function to fetch and transform drains
 */
export async function getDrains(): Promise<Drain[]> {
  const geojson = await fetchGeoJSON('/drainage/storm_drains.geojson');
  return transformDrainsGeoJSON(geojson);
}

/**
 * Fetch all drainage data in parallel
 * Optional optimization for initial load
 */
export async function getAllDrainageData() {
  const [inlets, outlets, pipes, drains] = await Promise.all([
    getInlets(),
    getOutlets(),
    getPipes(),
    getDrains(),
  ]);

  return { inlets, outlets, pipes, drains };
}
