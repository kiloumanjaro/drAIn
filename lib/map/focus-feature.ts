import type mapboxgl from 'mapbox-gl';

/** Identifies the feature whose Mapbox `selected` feature-state is set. */
export interface SelectedFeature {
  id: string | number;
  source: string;
  layer: string;
}

/** The subset of Mapbox flyTo options the pages configure. */
export interface CameraAnimation {
  targetZoom: number;
  speed: number;
  curve: number;
  essential: boolean;
  easing: (t: number) => number;
}

/**
 * Mark a feature as selected and fly the camera to it.
 *
 * Every dataset names its layer after its source, so the layer name is
 * derived rather than passed. Returns the selection for the caller to hold
 * in state, which keeps this free of React.
 *
 * The camera settings are a parameter because the map and simulation pages
 * each carry their own copy; they happen to match today.
 */
export function focusMapFeature(
  map: mapboxgl.Map,
  source: string,
  id: string,
  center: [number, number],
  camera: CameraAnimation
): SelectedFeature {
  map.setFeatureState({ source, id }, { selected: true });

  map.flyTo({
    center,
    zoom: camera.targetZoom,
    speed: camera.speed,
    curve: camera.curve,
    essential: camera.essential,
    easing: camera.easing,
  });

  return { id, source, layer: `${source}-layer` };
}
