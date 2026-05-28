/**
 * Pure helpers and constants extracted from `simulation/page.tsx`.
 *
 * These functions have no closure dependencies on component state or refs;
 * they take all inputs as parameters and are safe to import anywhere.
 */

// ---------------------------------------------------------------------------
// Vulnerability colour tables
// ---------------------------------------------------------------------------

/** Fill colours per vulnerability category (Mapbox circle paint). */
export const VULNERABILITY_FILL_COLORS = {
  high: '#D32F2F',
  medium: '#FFA000',
  low: '#FFF176',
  none: '#388E3C',
  fallback: '#5687ca',
} as const;

/** Darker stroke colours per vulnerability category. */
export const VULNERABILITY_STROKE_COLORS = {
  high: '#8B0000',
  medium: '#B36200',
  low: '#C4B000',
  none: '#1B5E20',
  fallback: '#00346c',
} as const;

// ---------------------------------------------------------------------------
// Magic numbers
// ---------------------------------------------------------------------------

/** Reference longitude/latitude length used when sampling along a pipe (~55 m). */
export const REFERENCE_SEGMENT_LENGTH_DEG = 0.0005;

/** Minimum distance (in degrees) between a sampled line point and an existing node. */
export const MIN_POINT_TO_NODE_DISTANCE_DEG = 0.00008;

/** Default samples emitted per reference segment when sampling a pipe. */
export const DEFAULT_SAMPLES_PER_SEGMENT = 3;

/** Flood-propagation pulse animation speed in cycles per second. */
export const FLOOD_PULSE_SPEED_HZ = 0.3;

/** Flood-propagation pulse amplitude (fraction of full intensity). */
export const FLOOD_PULSE_AMOUNT = 0.35;

/** Camera fly-to animation duration in ms. */
export const CAMERA_FLY_DURATION_MS = 1500;

/** Max attempts when waiting for a Mapbox source/layer to be ready. */
export const FLOOD_PROPAGATION_MAX_RETRIES = 10;

/** Multipliers controlling how dense line samples become per vulnerability bucket. */
export const VULNERABILITY_SAMPLE_MULTIPLIER = {
  high: 3,
  medium: 2,
  low: 1.5,
  none: 1,
} as const;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Look up the fill colour for a vulnerability category. Uses substring
 * matching so capitalisation and "Risk" suffixes are tolerated.
 */
export function getColorForCategory(category: string): string {
  const normalized = category.toLowerCase().trim();
  if (normalized.includes('high')) return VULNERABILITY_FILL_COLORS.high;
  if (normalized.includes('medium')) return VULNERABILITY_FILL_COLORS.medium;
  if (normalized.includes('low')) return VULNERABILITY_FILL_COLORS.low;
  if (normalized.includes('no')) return VULNERABILITY_FILL_COLORS.none;
  return VULNERABILITY_FILL_COLORS.fallback;
}

/**
 * Look up the stroke (border) colour for a vulnerability category. Same
 * substring-matching behaviour as {@link getColorForCategory}.
 */
export function getStrokeColorForCategory(category: string): string {
  const normalized = category.toLowerCase().trim();
  if (normalized.includes('high')) return VULNERABILITY_STROKE_COLORS.high;
  if (normalized.includes('medium')) return VULNERABILITY_STROKE_COLORS.medium;
  if (normalized.includes('low')) return VULNERABILITY_STROKE_COLORS.low;
  if (normalized.includes('no')) return VULNERABILITY_STROKE_COLORS.none;
  return VULNERABILITY_STROKE_COLORS.fallback;
}

/**
 * Reverse-engineer the vulnerability bucket from a colour string emitted by
 * Mapbox. Handles both the exact palette and interpolated `rgb(...)` values.
 */
export function getVulnerabilityFromColor(color: string): string {
  if (color.includes('211, 47, 47')) return 'High Risk';
  if (color.includes('255, 160, 0')) return 'Medium Risk';
  if (color.includes('255, 235, 100')) return 'Low Risk';
  if (color.includes('56, 142, 60')) return 'No Risk';

  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return 'Medium Risk';

  const [, r, g] = match.map(Number);
  if (r > 200 && g < 100) return 'High Risk';
  if (r > 200 && g > 200) return 'Low Risk';
  return 'Medium Risk';
}

/**
 * Sample evenly spaced points along a Mapbox `LineString` feature, weighted
 * by the line's vulnerability category so higher-risk pipes get denser
 * sampling for the flood-propagation heatmap.
 */
export function samplePointsFromLine(
  lineFeature: GeoJSON.Feature<GeoJSON.LineString>,
  samplesPerSegment: number = DEFAULT_SAMPLES_PER_SEGMENT
): GeoJSON.Feature[] {
  const coords = lineFeature.geometry.coordinates as [number, number][];
  if (coords.length < 2) return [];

  const props = lineFeature.properties || {};
  const vulnerability = getVulnerabilityFromColor(props.color || '');
  const points: GeoJSON.Feature[] = [];

  const segLengths: number[] = [];
  let totalLength = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const dx = coords[i + 1][0] - coords[i][0];
    const dy = coords[i + 1][1] - coords[i][1];
    const len = Math.sqrt(dx * dx + dy * dy);
    segLengths.push(len);
    totalLength += len;
  }
  if (totalLength === 0) return [];

  const vulnerabilityMultiplier =
    vulnerability === 'High Risk'
      ? VULNERABILITY_SAMPLE_MULTIPLIER.high
      : vulnerability === 'Medium Risk'
        ? VULNERABILITY_SAMPLE_MULTIPLIER.medium
        : vulnerability === 'Low Risk'
          ? VULNERABILITY_SAMPLE_MULTIPLIER.low
          : VULNERABILITY_SAMPLE_MULTIPLIER.none;

  const numSegments = Math.max(
    1,
    Math.round(totalLength / REFERENCE_SEGMENT_LENGTH_DEG)
  );
  const numSamples = Math.max(
    samplesPerSegment,
    Math.round(numSegments * samplesPerSegment * vulnerabilityMultiplier)
  );

  for (let i = 1; i <= numSamples; i++) {
    const t = i / (numSamples + 1);
    const targetDist = t * totalLength;

    let walked = 0;
    for (let s = 0; s < segLengths.length; s++) {
      if (walked + segLengths[s] >= targetDist) {
        const segT = (targetDist - walked) / segLengths[s];
        const lng = coords[s][0] + (coords[s + 1][0] - coords[s][0]) * segT;
        const lat = coords[s][1] + (coords[s + 1][1] - coords[s][1]) * segT;

        points.push({
          type: 'Feature',
          properties: {
            source: 'line',
            vulnerability,
            floodVolume: props.floodVolume || 0,
            pipeName: props.pipeName || '',
            phase: Math.random() * Math.PI * 2,
            offsetAngle: Math.random() * Math.PI * 2,
            offsetDistance: Math.random() * 0.00009,
          },
          geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
        } as GeoJSON.Feature);
        break;
      }
      walked += segLengths[s];
    }
  }

  return points;
}

/**
 * Returns true if `linePoint` is within `minDistance` (degrees) of any node
 * in `nodeFeatures` — used to suppress redundant heatmap points near nodes.
 */
export function isPointTooCloseToNodes(
  linePoint: [number, number],
  nodeFeatures: GeoJSON.Feature[],
  minDistance: number = MIN_POINT_TO_NODE_DISTANCE_DEG
): boolean {
  return nodeFeatures.some((nodeFeature) => {
    const nodeCoord = (nodeFeature.geometry as GeoJSON.Point).coordinates as [
      number,
      number,
    ];
    const dx = linePoint[0] - nodeCoord[0];
    const dy = linePoint[1] - nodeCoord[1];
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < minDistance;
  });
}

/**
 * Map a simulation node ID to its Mapbox source name. ISD-* are storm
 * drains; I-* are inlets; everything else is unknown.
 */
export function parseNodeId(nodeId: string): {
  source: string | null;
  featureId: string | null;
} {
  if (nodeId.startsWith('ISD-')) {
    return { source: 'storm_drains', featureId: nodeId };
  }
  if (nodeId.startsWith('I-')) {
    return { source: 'inlets', featureId: nodeId };
  }
  return { source: null, featureId: null };
}
