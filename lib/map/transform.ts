import type { FeatureCollection, Point } from 'geojson';

export interface DrainagePipe {
  id: string;
  geocode: string;
  vulnerabilityRating: 'low' | 'moderate' | 'high';
  location: string;
  installDate: string;
  lastInspection: string;
}

interface InletProperties {
  In_Name?: string;
  Inv_Elev?: number;
}

export function mapInletsToDrainagePipes(
  geojson: FeatureCollection<Point, InletProperties>
): DrainagePipe[] {
  return geojson.features.map((feature, index) => {
    const props = feature.properties ?? {};
    const [lng, lat] = feature.geometry.coordinates;
    const elev = props.Inv_Elev ?? 0;

    return {
      id: props.In_Name || `inlet-${index}`,
      geocode: props.In_Name || `inlet-${index}`,
      vulnerabilityRating: elev > 30 ? 'high' : elev > 20 ? 'moderate' : 'low',
      location: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      installDate: '2020-01-01',
      lastInspection: '2025-01-01',
    };
  });
}
