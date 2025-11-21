/**
 * All 29 barangays in Mandaue City
 */
export const MANDAUE_BARANGAYS = [
  "Bakilid",
  "Centro",
  "Casuntingan",
  "Casili",
  "Canduman",
  "Cambaro",
  "Cabancalan",
  "Cubacub",
  "Basak",
  "Banilad",
  "Alang-alang",
  "Ibabao",
  "Jagobiao",
  "Guizo",
  "Looc",
  "Maguikay",
  "Opao",
  "Labogon",
  "Mantuyong",
  "Pagsabungan",
  "Pakna-an",
  "Recle",
  "Tabok",
  "Subangdaku",
  "Tawason",
  "Tingub",
  "Tipolo",
  "Umapad",
];

/**
 * Extract zone/barangay from address
 * Matches against known barangay names in Mandaue City
 */
export function extractZoneFromAddress(address: string): string {
  if (!address) return "Unknown";

  const lowerAddress = address.toLowerCase();

  // Find matching barangay
  const found = MANDAUE_BARANGAYS.find((barangay) =>
    lowerAddress.includes(barangay.toLowerCase())
  );

  return found || "Unknown";
}

/**
 * Load GeoJSON data for Mandaue City barangays
 * This should be loaded from the public assets
 */
export interface GeoJSONFeature {
  type: "Feature";
  properties: {
    name: string;
    "population-count": string;
    "population-density": string;
    "land-area": string;
    fill: string;
    stroke: string;
    "fill-opacity": number;
    "stroke-opacity": number;
    "stroke-width": number;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

/**
 * Fetch GeoJSON data from public assets
 */
export async function loadMandaueGeoJSON(): Promise<
  GeoJSONFeatureCollection | null
> {
  try {
    const response = await fetch(
      "/additional-overlays/mandaue_population.geojson"
    );
    if (!response.ok) {
      throw new Error(`Failed to load GeoJSON: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error loading GeoJSON:", error);
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
  return parseInt(populationStr.replace(/,/g, ""), 10) || 0;
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

export function getBarangayInfo(
  feature: GeoJSONFeature
): BarangayInfo {
  return {
    name: feature.properties.name,
    population: formatPopulation(feature.properties["population-count"]),
    density: formatPopulation(feature.properties["population-density"]),
    area: parseFloat(feature.properties["land-area"]) || 0,
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
    .filter((name) => name && name !== "Mandaue City");
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
    return { color: "text-red-600", bgColor: "bg-red-100" };
  }
  if (count >= 15) {
    return { color: "text-orange-600", bgColor: "bg-orange-100" };
  }
  if (count >= 10) {
    return { color: "text-yellow-600", bgColor: "bg-yellow-100" };
  }
  if (count >= 5) {
    return { color: "text-blue-600", bgColor: "bg-blue-100" };
  }
  return { color: "text-gray-600", bgColor: "bg-gray-100" };
}

/**
 * Format zone name for display
 */
export function formatZoneName(zone: string): string {
  return zone || "Unknown Zone";
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
