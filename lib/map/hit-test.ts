import type mapboxgl from 'mapbox-gl';
import { HIT_AREA_LAYER_IDS, LAYER_COLORS } from './config';

/** A place on the screen, in pixels: what `map.project` returns. */
export interface ScreenPoint {
  x: number;
  y: number;
}

/** As much of a rendered feature as choosing between them needs. */
export interface HitFeature {
  geometry: { type: string; coordinates?: unknown };
  layer?: { id: string };
}

/**
 * How far each dataset's drawn symbol reaches from its geometry, in pixels:
 * a circle's radius with its border, half a line's width. A click inside
 * that is on the symbol itself.
 */
const DRAWN_REACH: Record<string, number> = {
  'man_pipes-hit-layer': LAYER_COLORS.man_pipes.width / 2,
  'storm_drains-hit-layer':
    LAYER_COLORS.storm_drains.radius + LAYER_COLORS.storm_drains.strokeWidth,
  'inlets-hit-layer':
    LAYER_COLORS.inlets.radius + LAYER_COLORS.inlets.strokeWidth,
  'outlets-hit-layer':
    LAYER_COLORS.outlets.radius + LAYER_COLORS.outlets.strokeWidth,
};

/** The reach of the symbol a hit-layer feature stands for; 0 if unknown. */
export function drawnReach(feature: HitFeature): number {
  const layerId = feature.layer?.id;
  return layerId && Object.hasOwn(DRAWN_REACH, layerId)
    ? DRAWN_REACH[layerId]
    : 0;
}

function isPosition(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  );
}

function distanceToSegment(
  p: ScreenPoint,
  a: ScreenPoint,
  b: ScreenPoint
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  // How far along the segment the nearest point lies, held to its two ends.
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared)
        );
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Distance to a run of positions: its segments if `joined`, else its points. */
function distanceToPositions(
  positions: unknown,
  point: ScreenPoint,
  project: (lngLat: [number, number]) => ScreenPoint,
  joined: boolean
): number {
  if (!Array.isArray(positions)) return Infinity;
  const projected = positions.filter(isPosition).map(project);
  if (!joined || projected.length === 1) {
    return Math.min(
      Infinity,
      ...projected.map((q) => Math.hypot(point.x - q.x, point.y - q.y))
    );
  }
  let nearest = Infinity;
  for (let i = 1; i < projected.length; i++) {
    nearest = Math.min(
      nearest,
      distanceToSegment(point, projected[i - 1], projected[i])
    );
  }
  return nearest;
}

/**
 * How far a feature is from a point on the screen, in pixels: to the point
 * for a point feature, to the nearest stretch of the line for a line.
 * Infinity for a geometry with nothing to measure.
 */
export function pixelDistance(
  geometry: HitFeature['geometry'],
  point: ScreenPoint,
  project: (lngLat: [number, number]) => ScreenPoint
): number {
  const { type, coordinates } = geometry;
  switch (type) {
    case 'Point':
      return distanceToPositions([coordinates], point, project, false);
    case 'MultiPoint':
      return distanceToPositions(coordinates, point, project, false);
    case 'LineString':
      return distanceToPositions(coordinates, point, project, true);
    case 'MultiLineString':
    case 'Polygon':
      return Array.isArray(coordinates)
        ? Math.min(
            Infinity,
            ...coordinates.map((line) =>
              distanceToPositions(line, point, project, true)
            )
          )
        : Infinity;
    default:
      return Infinity;
  }
}

const isLine = (feature: HitFeature) =>
  feature.geometry.type === 'LineString' ||
  feature.geometry.type === 'MultiLineString';

/**
 * Of the features a click landed on, the one it was aimed at: the nearest
 * on the screen. The click targets are much wider than what is drawn and
 * overlap, and taking the first one returned gave a click on the middle of
 * a pipe to whichever inlet's target also covered it.
 *
 * Distance is counted from the edge of the drawn symbol (`reachOf`), so a
 * click anywhere on a symbol is as near as can be. When that leaves several
 * equal, as where a pipe ends under an inlet, a point wins over a line (it
 * is drawn on top and is the smaller thing to hit), then the nearer centre,
 * then the order given, which is topmost first.
 */
export function nearestFeature<T extends HitFeature>(
  features: readonly T[],
  point: ScreenPoint,
  project: (lngLat: [number, number]) => ScreenPoint,
  reachOf: (feature: T) => number = drawnReach
): T | null {
  let best: { feature: T; rank: [number, number, number] } | null = null;

  for (const feature of features) {
    const distance = pixelDistance(feature.geometry, point, project);
    const rank: [number, number, number] = [
      Math.max(0, distance - reachOf(feature)),
      isLine(feature) ? 1 : 0,
      distance,
    ];
    const better =
      best === null ||
      rank[0] < best.rank[0] ||
      (rank[0] === best.rank[0] &&
        (rank[1] < best.rank[1] ||
          (rank[1] === best.rank[1] && rank[2] < best.rank[2])));
    if (better) best = { feature, rank };
  }

  return best ? best.feature : null;
}

/** The drainage click-target layers this map has now; none before its style loads. */
export function drainageHitLayers(map: mapboxgl.Map): string[] {
  return HIT_AREA_LAYER_IDS.filter((id) => map.getLayer(id));
}

/**
 * Whether a click here lands on a drainage component. A hidden dataset's
 * click targets are hidden with it, so it does not count.
 */
export function hitsDrainageComponent(
  map: mapboxgl.Map,
  point: mapboxgl.Point
): boolean {
  const layers = drainageHitLayers(map);
  if (!layers.length) return false;
  return map.queryRenderedFeatures(point, { layers }).length > 0;
}
