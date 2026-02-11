import type {
  FeatureCollection,
  Feature,
  GeoJsonProperties,
  LineString,
  Point,
} from 'geojson';
import type {
  Inlet,
  Outlet,
  Pipe,
  Drain,
} from '@/components/control-panel/types';

/**
 * Transform raw GeoJSON into typed Inlet objects
 */
function transformInlets(geojson: FeatureCollection): Inlet[] {
  return geojson.features.map((f: Feature) => {
    const props = f.properties as GeoJsonProperties & {
      In_Name: string;
      Inv_Elev: number;
      MaxDepth: number;
      Length: number;
      Height: number;
      Weir_Coeff: number;
      In_Type: number;
      ClogFac: number;
      ClogTime: number;
      FPLAIN_080: number;
    };

    return {
      id: props.In_Name,
      Inv_Elev: props.Inv_Elev,
      MaxDepth: props.MaxDepth,
      Length: props.Length,
      Height: props.Height,
      Weir_Coeff: props.Weir_Coeff,
      In_Type: props.In_Type,
      ClogFac: props.ClogFac,
      ClogTime: props.ClogTime,
      FPLAIN_080: props.FPLAIN_080,
      coordinates:
        f.geometry?.type === 'Point'
          ? (f.geometry.coordinates as [number, number])
          : [0, 0],
    };
  });
}

/**
 * Transform raw GeoJSON into typed Outlet objects
 */
function transformOutletGeoJSON(geojson: FeatureCollection): Outlet[] {
  return geojson.features.map((f: Feature) => {
    const props = f.properties as GeoJsonProperties & {
      Out_Name: string;
      Inv_Elev: number;
      AllowQ: number;
      FlapGate: number;
    };

    const coords =
      f.geometry?.type === 'Point' ? f.geometry.coordinates : [0, 0];

    return {
      id: props.Out_Name,
      Inv_Elev: props.Inv_Elev,
      AllowQ: props.AllowQ,
      FlapGate: props.FlapGate,
      coordinates: coords as [number, number],
    };
  });
}

/**
 * Transform raw GeoJSON into typed Pipe objects
 */
function transformPipesGeoJSON(geojson: FeatureCollection): Pipe[] {
  return geojson.features.map((f: Feature) => {
    const props = f.properties as GeoJsonProperties & {
      Name: string;
      TYPE: string;
      Pipe_Shape: string;
      Pipe_Lngth: number;
      Height: number;
      Width: number;
      Barrels: number;
      ClogPer: number;
      ClogTime: number;
      Mannings: number;
    };

    const coords =
      f.geometry && f.geometry.type === 'LineString'
        ? (f.geometry as LineString).coordinates
        : [];

    return {
      id: props.Name,
      TYPE: props.TYPE,
      Pipe_Shape: props.Pipe_Shape,
      Pipe_Lngth: props.Pipe_Lngth,
      Height: props.Height,
      Width: props.Width,
      Barrels: props.Barrels,
      ClogPer: props.ClogPer,
      ClogTime: props.ClogTime,
      Mannings: props.Mannings,
      coordinates: coords as [number, number][],
    };
  });
}

/**
 * Transform raw GeoJSON into typed Drain objects
 */
function transformDrainsGeoJSON(geojson: FeatureCollection): Drain[] {
  return geojson.features.map((f: Feature) => {
    const props = f.properties as GeoJsonProperties & {
      In_Name: string;
      InvElev: number;
      clog_per: number;
      clogtime: number;
      Weir_coeff: number;
      Length: number;
      Height: number;
      Max_Depth: number;
      ClogFac: number;
      NameNum: number;
      FPLAIN_080: number;
    };

    const coords =
      f.geometry && f.geometry.type === 'Point'
        ? (f.geometry as Point).coordinates
        : [0, 0];

    return {
      id: props.In_Name,
      In_Name: props.In_Name,
      InvElev: props.InvElev,
      clog_per: props.clog_per,
      clogtime: props.clogtime,
      Weir_coeff: props.Weir_coeff,
      Length: props.Length,
      Height: props.Height,
      Max_Depth: props.Max_Depth,
      ClogFac: props.ClogFac,
      NameNum: props.NameNum,
      FPLAIN_080: props.FPLAIN_080,
      coordinates: coords as [number, number],
    };
  });
}

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
