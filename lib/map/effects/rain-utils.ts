import mapboxgl from 'mapbox-gl';
import { REDUCED_MOTION_QUERY } from './flood-propagation-animation';

/** True when the visitor asked their system for less motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Calculate zoom-based reveal value for rain parameters
 * Returns a value that scales with map zoom level for smooth transitions
 *
 * @param value - Base value to scale (e.g., 0.5, 1.0)
 * @returns Scaled value based on current map zoom
 */
export function zoomBasedReveal(map: mapboxgl.Map, value: number): number {
  const zoom = map.getZoom();
  // Scale value based on zoom: starts revealing at zoom 10, full at zoom 15
  const factor = Math.max(0, Math.min(1, (zoom - 10) / 5));
  return factor * value;
}

/**
 * Enable rain effect on the map using Mapbox's setRain API
 *
 * Falling rain has no still form, so it is not started for a visitor who
 * asked for less motion.
 *
 * @param map - Mapbox GL JS map instance
 */
export function enableRain(map: mapboxgl.Map): void {
  if (!map || typeof map.setRain !== 'function') {
    return;
  }
  if (prefersReducedMotion()) {
    return;
  }

  try {
    map.setRain({
      density: zoomBasedReveal(map, 0.5),
      intensity: 1.0,
      color: '#a8adbc',
      opacity: 0.7,
      vignette: zoomBasedReveal(map, 1.0),
      'vignette-color': '#464646',
      direction: [0, 80],
      'droplet-size': [2.6, 18.2],
      'distortion-strength': 0.7,
      'center-thinning': 0, // Rain displayed on the whole screen area
    });
  } catch (error) {
    console.error('Error enabling rain effect:', error);
  }
}

/**
 * Disable rain effect on the map
 *
 * @param map - Mapbox GL JS map instance
 */
export function disableRain(map: mapboxgl.Map): void {
  if (!map || typeof map.setRain !== 'function') {
    return;
  }

  try {
    map.setRain({ intensity: 0 });
  } catch (error) {
    // Ignore "Style is not done loading" errors - the rain will still disable
    if (
      error instanceof Error &&
      error.message.includes('Style is not done loading')
    ) {
      return;
    }
    console.error('Error disabling rain effect:', error);
  }
}
