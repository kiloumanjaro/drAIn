/**
 * All 29 barangays in Mandaue City
 */
export const MANDAUE_BARANGAYS = [
  'Bakilid',
  'Centro',
  'Casuntingan',
  'Casili',
  'Canduman',
  'Cambaro',
  'Cabancalan',
  'Cubacub',
  'Basak',
  'Banilad',
  'Alang-alang',
  'Ibabao',
  'Jagobiao',
  'Guizo',
  'Looc',
  'Maguikay',
  'Opao',
  'Labogon',
  'Mantuyong',
  'Pagsabungan',
  'Pakna-an',
  'Recle',
  'Tabok',
  'Subangdaku',
  'Tawason',
  'Tingub',
  'Tipolo',
  'Umapad',
];

/**
 * Extract zone/barangay from address
 * Matches against known barangay names in Mandaue City
 */
export function extractZoneFromAddress(address: string): string {
  if (!address) return 'Unknown';

  const lowerAddress = address.toLowerCase();

  // Find matching barangay
  const found = MANDAUE_BARANGAYS.find((barangay) =>
    lowerAddress.includes(barangay.toLowerCase())
  );

  return found || 'Unknown';
}

/**
 * Load GeoJSON data for Mandaue City barangays
 * This should be loaded from the public assets
 */
export interface GeoJSONFeature {
  type: 'Feature';
  properties: {
    name: string;
    'population-count': string;
    'population-density': string;
    'land-area': string;
    fill: string;
    stroke: string;
    'fill-opacity': number;
    'stroke-opacity': number;
    'stroke-width': number;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

/**
 * Fetch GeoJSON data from public assets
 */
export async function loadMandaueGeoJSON(): Promise<GeoJSONFeatureCollection | null> {
  try {
    const response = await fetch(
      '/additional-overlays/mandaue_population.geojson'
    );
    if (!response.ok) {
      throw new Error(`Failed to load GeoJSON: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading GeoJSON:', error);
    return null;
  }
}

/**
 * Get barangay polygon by name from GeoJSON features
 */
export function getBarangayFeature(
  features: GeoJSONFeature[],
  barangayName: string
): GeoJSONFeature | null {
  return (
    features.find(
      (feature) =>
        feature.properties.name.toLowerCase() === barangayName.toLowerCase()
    ) || null
  );
}

/**
 * Format population count (remove commas)
 */
export function formatPopulation(populationStr: string): number {
  return parseInt(populationStr.replace(/,/g, ''), 10) || 0;
}

/**
 * Get barangay info from GeoJSON properties
 */
export interface BarangayInfo {
  name: string;
  population: number;
  density: number;
  area: number;
}

export function getBarangayInfo(feature: GeoJSONFeature): BarangayInfo {
  return {
    name: feature.properties.name,
    population: formatPopulation(feature.properties['population-count']),
    density: formatPopulation(feature.properties['population-density']),
    area: parseFloat(feature.properties['land-area']) || 0,
  };
}

/**
 * Get all barangay names from GeoJSON
 */
export function getBarangayNamesFromGeoJSON(
  geojson: GeoJSONFeatureCollection
): string[] {
  return geojson.features
    .map((feature) => feature.properties.name)
    .filter((name) => name && name !== 'Mandaue City');
}

/**
 * Create a style for zones based on issue count
 * Returns different colors based on severity
 */
export function getZoneColorByCount(count: number): {
  color: string;
  bgColor: string;
} {
  if (count >= 20) {
    return { color: 'text-red-600', bgColor: 'bg-red-100' };
  }
  if (count >= 15) {
    return { color: 'text-orange-600', bgColor: 'bg-orange-100' };
  }
  if (count >= 10) {
    return { color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
  }
  if (count >= 5) {
    return { color: 'text-blue-600', bgColor: 'bg-blue-100' };
  }
  return { color: 'text-gray-600', bgColor: 'bg-gray-100' };
}

/**
 * Format zone name for display
 */
export function formatZoneName(zone: string): string {
  return zone || 'Unknown Zone';
}

/**
 * Batch update zone field on reports
 * This is typically done on the client when report data is fetched
 */
export function updateReportZones(
  reports: Array<{ address: string; zone?: string }>
): void {
  reports.forEach((report) => {
    if (!report.zone && report.address) {
      report.zone = extractZoneFromAddress(report.address);
    }
  });
}

/**
 * Calculate the centroid of a polygon using the formula for center of mass
 * @param coordinates - Array of [longitude, latitude] pairs forming a polygon ring
 * @returns [longitude, latitude] of the centroid
 */
function calculatePolygonCentroid(coordinates: number[][]): [number, number] {
  let x = 0,
    y = 0,
    area = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const [x1, y1] = coordinates[i];
    const [x2, y2] = coordinates[i + 1];
    const cross = x1 * y2 - x2 * y1;
    area += cross;
    x += (x1 + x2) * cross;
    y += (y1 + y2) * cross;
  }

  area /= 2;
  x /= 6 * area;
  y /= 6 * area;

  return [x, y];
}

/**
 * Calculate the centroid of a polygon or multipolygon feature
 * Returns [longitude, latitude]
 * @param feature - GeoJSON feature with Polygon or MultiPolygon geometry
 * @returns [longitude, latitude] coordinates of the centroid
 */
export function calculateCentroid(feature: GeoJSONFeature): [number, number] {
  const geometry = feature.geometry;

  if (geometry.type === 'Polygon') {
    // For simple polygon, use the outer ring (first element)
    return calculatePolygonCentroid(geometry.coordinates[0] as number[][]);
  } else if (geometry.type === 'MultiPolygon') {
    // For multipolygon, use the largest polygon's centroid
    const polygons = geometry.coordinates as number[][][][];
    const largestPolygon = polygons.reduce((largest, current) => {
      return current[0].length > largest[0].length ? current : largest;
    });
    return calculatePolygonCentroid(largestPolygon[0] as number[][]);
  }

  // Fallback to origin if geometry type is unexpected
  return [0, 0];
}

/**
 * Generate random offset from center for organic heatmap distribution
 * Uses seeded randomness based on barangay name for consistency
 */
function getRandomOffset(
  seed: string,
  index: number,
  maxOffset: number
): [number, number] {
  // Simple hash function for consistent randomness
  let hash = 0;
  const str = seed + index.toString();
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash;
  }

  // Convert hash to pseudo-random angle and distance
  const angle = ((hash % 360) / 360) * 2 * Math.PI;
  const distance = ((Math.abs(hash) % 1000) / 1000) * maxOffset;

  return [Math.cos(angle) * distance, Math.sin(angle) * distance];
}

/**
 * Create a GeoJSON FeatureCollection of scattered points for organic heatmap
 * Creates multiple points per barangay to avoid perfect circle effect
 * @param features - Array of barangay polygon features
 * @param zoneData - Array of zone issue data with counts
 * @returns GeoJSON FeatureCollection of Point features
 */
export function createHeatmapPoints(
  features: GeoJSONFeature[],
  zoneData: { zone: string; count: number }[]
): GeoJSON.FeatureCollection {
  const points: GeoJSON.Feature[] = [];

  features.forEach((feature) => {
    const barangayName = feature.properties?.name;
    const zoneInfo = zoneData.find(
      (z) => z.zone.toLowerCase() === barangayName?.toLowerCase()
    );
    const issueCount = zoneInfo?.count || 0;
    const centroid = calculateCentroid(feature);

    // Determine number of scattered points based on issue count
    // More issues = more points = more irregular shape
    const numPoints = Math.max(3, Math.min(12, Math.ceil(issueCount / 2) + 3));

    // Maximum offset in degrees (~0.002 degrees ≈ 200m)
    const maxOffset = 0.002;

    // Create multiple scattered points for organic distribution
    for (let i = 0; i < numPoints; i++) {
      const [offsetX, offsetY] = getRandomOffset(
        barangayName || '',
        i,
        maxOffset
      );

      points.push({
        type: 'Feature',
        properties: {
          name: barangayName,
          issueCount: Math.ceil(issueCount / numPoints), // Distribute weight across points
        },
        geometry: {
          type: 'Point',
          coordinates: [centroid[0] + offsetX, centroid[1] + offsetY],
        },
      });
    }
  });

  return {
    type: 'FeatureCollection',
    features: points,
  };
}

/**
 * Create a GeoJSON FeatureCollection from actual report coordinates
 * This creates a truly accurate heatmap based on real report locations
 * @param reports - Array of reports with coordinates [long, lat]
 * @returns GeoJSON FeatureCollection of Point features
 */
export function createHeatmapFromReports(
  reports: Array<{ coordinates: [number, number]; zone?: string }>
): GeoJSON.FeatureCollection {
  const points: GeoJSON.Feature[] = reports
    .filter(
      (report) =>
        report.coordinates &&
        report.coordinates[0] !== 0 &&
        report.coordinates[1] !== 0
    )
    .map((report) => ({
      type: 'Feature',
      properties: {
        zone: report.zone || 'Unknown',
      },
      geometry: {
        type: 'Point',
        coordinates: report.coordinates,
      },
    }));

  return {
    type: 'FeatureCollection',
    features: points,
  };
}
