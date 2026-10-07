import { useCallback, useRef, type RefObject } from 'react';
import type mapboxgl from 'mapbox-gl';
import {
  clearPopulationSelection,
  registerPopulationInteractions,
  type PopulationSelection,
} from '@/lib/map/population-layer';

/**
 * The barangay population overlay's hover, click and popup.
 *
 * The map is created inside the page's own effect, so this hands back the
 * two things that effect and the visibility effect need rather than running
 * an effect of its own. Both functions are stable.
 */
export function usePopulationLayer(
  overlayVisibilityRef: RefObject<{ 'mandaue_population-layer': boolean }>
) {
  const selectionRef = useRef<PopulationSelection>({
    clickedId: null,
    popup: null,
  });

  /** Call once, when the map is created. */
  const registerPopulationLayer = useCallback(
    (map: mapboxgl.Map) =>
      registerPopulationInteractions(
        map,
        selectionRef.current,
        () => overlayVisibilityRef.current['mandaue_population-layer']
      ),
    [overlayVisibilityRef]
  );

  /** Call when the overlay is switched off. */
  const clearPopulationLayerSelection = useCallback(
    (map: mapboxgl.Map) => clearPopulationSelection(map, selectionRef.current),
    []
  );

  return { registerPopulationLayer, clearPopulationLayerSelection };
}
