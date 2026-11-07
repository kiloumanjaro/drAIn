/**
 * Pure helpers and constants extracted from `simulation/page.tsx`.
 *
 * These functions have no closure dependencies on component state or refs;
 * they take all inputs as parameters and are safe to import anywhere.
 */

// The flood sampling helpers live in lib/map/effects/line-sampling.ts.

/** Camera fly-to animation duration in ms. */
export const CAMERA_FLY_DURATION_MS = 1500;

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

/**
 * Where a simulation node is, given the source `parseNodeId` put it in.
 * Null when the source holds no node with that id.
 */
export function findNodeCoordinates(
  source: string,
  featureId: string,
  inlets: { id: string; coordinates: [number, number] }[],
  drains: { id: string; coordinates: [number, number] }[]
): [number, number] | null {
  const nodes =
    source === 'inlets' ? inlets : source === 'storm_drains' ? drains : [];
  return nodes.find((node) => node.id === featureId)?.coordinates ?? null;
}
