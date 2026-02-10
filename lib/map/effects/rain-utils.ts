import mapboxgl from 'mapbox-gl';

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
 * @param map - Mapbox GL JS map instance
 * @param intensity - Rain intensity (0-1.0), defaults to 1.0. Values are clamped to the valid range.
 */
export function enableRain(map: mapboxgl.Map, intensity: number = 1.0): void {
  if (!map || typeof map.setRain !== 'function') {
    console.warn(
      "setRain API is not available. Ensure you're using Mapbox Standard style."
    );
    return;
  }

  // Clamp intensity to valid range (0-1.0)
  const clampedIntensity = Math.max(0, Math.min(1.0, intensity));

  try {
    map.setRain({
      density: zoomBasedReveal(map, 0.5),
      intensity: clampedIntensity,
      color: '#a8adbc',
      opacity: 0.7,
      vignette: zoomBasedReveal(map, 1.0),
      'vignette-color': '#464646',
      direction: [0, 80],
      'droplet-size': [2.6, 18.2],
      'distortion-strength': 0.7,
      'center-thinning': 0, // Rain displayed on the whole screen area
    });
    console.log('[Rain] Rain effect enabled with intensity:', clampedIntensity);
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

  // Only disable if style is loaded, otherwise silently ignore
  if (!map.isStyleLoaded()) {
    return;
  }

  try {
    // According to Mapbox docs, setting intensity to 0 should disable rain
    map.setRain({ intensity: 0 });
    console.log('[Rain] Rain effect disabled');
  } catch (error) {
    console.error('Error disabling rain effect:', error);
  }
}
