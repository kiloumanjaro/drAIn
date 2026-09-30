import type mapboxgl from 'mapbox-gl';

import {
  FLOOD_PROPAGATION_MAX_RETRIES,
  isPointTooCloseToNodes,
  samplePointsFromLine,
} from '@/app/(main)/simulation/page.helpers';
import {
  type HazardLevel,
  normaliseHazardCategory,
} from '@/lib/simulation-api/hazard-category';
import type { NodeCoordinates, NodeDetails } from '@/types/simulation';

export interface FloodPropagationFeatures {
  nodes: GeoJSON.Feature[];
  lines: GeoJSON.Feature[];
}

const PIPES_GEOJSON_URL = '/drainage/man_pipes.geojson';

/** Midpoint only: one sample per pipe segment. */
const SAMPLES_PER_PIPE_SEGMENT = 1;

/** Maximum random wobble applied to a node point, in degrees (~9 m). */
const MAX_WOBBLE_DEG = 0.00009;

const SOURCES = {
  nodes: 'flood_propagation_nodes',
  lines: 'flood_propagation_lines',
} as const;

const LAYERS = {
  nodes: 'flood_propagation-nodes-layer',
  lines: 'flood_propagation-lines-layer',
} as const;

/** Mapbox needs a moment after a style change before sources resolve. */
const INITIAL_DELAY_MS = 500;
const RETRY_DELAY_MS = 300;

/** How strongly each hazard band pulls the flood heatmap. */
const HEATMAP_WEIGHT_BY_LEVEL: Record<HazardLevel, number> = {
  high: 5,
  medium: 1.5,
  low: 0.6,
  none: 0.2,
};

/**
 * Heatmap weight for a node's hazard category.
 *
 * Works on either vocabulary: a live run's "High" and a stored scenario's
 * "High Risk" weigh the same. The heatmap used to match the stored labels
 * exactly, so every node of a live run got the 0.2 floor.
 */
export function floodHeatmapWeight(category: string): number {
  return HEATMAP_WEIGHT_BY_LEVEL[normaliseHazardCategory(category)];
}

function asFeatureCollection(
  features: GeoJSON.Feature[]
): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features };
}

/**
 * Build one animated point per flooded node.
 *
 * Each point carries a random phase and wobble so the pulse animation does
 * not move every point in lockstep.
 */
export function buildNodeFloodFeatures(
  vulnerabilityData: NodeDetails[],
  locations: NodeCoordinates[]
): GeoJSON.Feature[] {
  const coordinatesById = new Map(
    locations.map((location) => [location.id, location.coordinates])
  );

  return vulnerabilityData
    .filter((node) => node.Total_Flood_Volume > 0)
    .map((node): GeoJSON.Feature | null => {
      const coordinates = coordinatesById.get(node.Node_ID);
      if (!coordinates) {
        console.warn(
          `[Flood Propagation] No coordinates found for node: ${node.Node_ID}`
        );
        return null;
      }

      return {
        type: 'Feature',
        properties: {
          source: 'node',
          nodeId: node.Node_ID,
          vulnerability: node.Vulnerability_Category,
          hazardWeight: floodHeatmapWeight(node.Vulnerability_Category),
          floodVolume: node.Total_Flood_Volume,
          maximumRate: node.Maximum_Rate,
          hoursFlooded: node.Hours_Flooded,
          phase: Math.random() * Math.PI * 2,
          offsetAngle: Math.random() * Math.PI * 2,
          offsetDistance: Math.random() * MAX_WOBBLE_DEG,
        },
        geometry: { type: 'Point', coordinates },
      };
    })
    .filter((feature): feature is GeoJSON.Feature => feature !== null);
}

/**
 * Sample points along the flooded pipes between nodes.
 *
 * Points that would sit on top of a node point are dropped. Returns an empty
 * list if the pipe geometry cannot be loaded, so the node points still show.
 */
export async function buildLineFloodFeatures(
  vulnerabilityData: NodeDetails[],
  locations: NodeCoordinates[],
  nodeFeatures: GeoJSON.Feature[]
): Promise<GeoJSON.Feature[]> {
  try {
    const [pipesData, { createFloodAlongPipes }] = await Promise.all([
      fetch(PIPES_GEOJSON_URL).then(
        (response) => response.json() as Promise<GeoJSON.FeatureCollection>
      ),
      import('@/lib/map/effects/flood-3d-utils'),
    ]);

    const floodLines = createFloodAlongPipes(
      vulnerabilityData,
      locations,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- createFloodAlongPipes accepts a looser geojson shape than the app-side FeatureCollection
      (pipesData.features ?? []) as any
    );

    return floodLines.features
      .flatMap((line) =>
        samplePointsFromLine(
          line as GeoJSON.Feature<GeoJSON.LineString>,
          SAMPLES_PER_PIPE_SEGMENT
        )
      )
      .filter(
        (point) =>
          !isPointTooCloseToNodes(
            (point.geometry as GeoJSON.Point).coordinates as [number, number],
            nodeFeatures
          )
      );
  } catch (error) {
    console.error(
      '[Flood Propagation] Error loading/processing pipe data:',
      error
    );
    return [];
  }
}

/** Build every point of the flood-propagation heatmap. */
export async function buildFloodPropagationFeatures(
  vulnerabilityData: NodeDetails[],
  locations: NodeCoordinates[]
): Promise<FloodPropagationFeatures> {
  const nodes = buildNodeFloodFeatures(vulnerabilityData, locations);
  const lines = await buildLineFloodFeatures(
    vulnerabilityData,
    locations,
    nodes
  );
  return { nodes, lines };
}

/**
 * Push the heatmap features onto the map once its sources and layers exist.
 *
 * The style may still be loading when results arrive, so this retries a
 * bounded number of times before giving up. Calls `onApplied` on success.
 */
export function setFloodPropagationData(
  map: mapboxgl.Map,
  features: FloodPropagationFeatures,
  onApplied: () => void,
  maxRetries: number = FLOOD_PROPAGATION_MAX_RETRIES
): void {
  let attempt = 0;

  const apply = () => {
    const nodeSource = map.getSource(SOURCES.nodes) as
      | mapboxgl.GeoJSONSource
      | undefined;
    const lineSource = map.getSource(SOURCES.lines) as
      | mapboxgl.GeoJSONSource
      | undefined;

    const ready =
      nodeSource &&
      lineSource &&
      map.getLayer(LAYERS.nodes) &&
      map.getLayer(LAYERS.lines);

    if (ready) {
      nodeSource.setData(asFeatureCollection(features.nodes));
      lineSource.setData(asFeatureCollection(features.lines));
      onApplied();
      return;
    }

    attempt++;
    if (attempt < maxRetries) {
      setTimeout(apply, RETRY_DELAY_MS);
    } else {
      console.error('[Flood Propagation] Failed to update after max retries');
    }
  };

  setTimeout(apply, INITIAL_DELAY_MS);
}
