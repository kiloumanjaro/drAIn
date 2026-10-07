import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type mapboxgl from 'mapbox-gl';
import {
  FLOOD_PROPAGATION_LAYERS,
  buildFloodPropagationFeatures,
  setFloodPropagationData,
} from '@/lib/map/effects/flood-propagation';
import {
  REDUCED_MOTION_QUERY,
  createFloodPropagationAnimator,
  type FloodPropagationAnimator,
} from '@/lib/map/effects/flood-propagation-animation';
import type { NodeCoordinates, NodeDetails } from '@/types/simulation';

const LAYER_IDS = [
  FLOOD_PROPAGATION_LAYERS.nodes,
  FLOOD_PROPAGATION_LAYERS.lines,
] as const;

/**
 * The flood-propagation heatmap: its switch, its data and its pulse.
 *
 * The loop itself lives in lib/map/effects/flood-propagation-animation.ts and
 * decides on every frame whether to go on. This hook starts it at the moments
 * something may have changed in its favour (new results, the switch, the tab
 * coming back into view) and stops it when the page goes.
 */
export function useFloodPropagationAnimation(
  mapRef: RefObject<mapboxgl.Map | null>
) {
  const [isFloodPropagationActive, setIsFloodPropagationActive] =
    useState(true); // Enabled by default
  // Made on first use, in a handler or an effect: it reads the map ref,
  // which render must not.
  const animatorRef = useRef<FloodPropagationAnimator | null>(null);
  const getAnimator = useCallback(
    () =>
      (animatorRef.current ??= createFloodPropagationAnimator(
        () => mapRef.current
      )),
    [mapRef]
  );

  useEffect(() => {
    const animator = getAnimator();
    const onVisibilityChange = () => {
      if (document.hidden) animator.stop();
      else animator.start();
    };
    // The loop reads the setting itself; this only restarts it when the
    // visitor turns reduced motion back off.
    const onMotionChange = () => animator.start();
    const motionQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia(REDUCED_MOTION_QUERY)
        : null;

    document.addEventListener('visibilitychange', onVisibilityChange);
    motionQuery?.addEventListener('change', onMotionChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      motionQuery?.removeEventListener('change', onMotionChange);
      animator.stop();
    };
  }, [getAnimator]);

  /**
   * Rebuild the heatmap from a set of results and push it onto the map,
   * starting the pulse once the data lands.
   */
  const updateFloodPropagation = useCallback(
    async (vulnerabilityData: NodeDetails[], locations: NodeCoordinates[]) => {
      const map = mapRef.current;
      if (!map) return;

      const features = await buildFloodPropagationFeatures(
        vulnerabilityData,
        locations
      );
      // The page may have closed while the pipes were loading.
      if (mapRef.current !== map) return;

      const animator = getAnimator();
      animator.setFeatures(features);

      setFloodPropagationData(map, features, () => {
        setIsFloodPropagationActive(true);
        animator.setEnabled(true);
        animator.start();
      });
    },
    [mapRef, getAnimator]
  );

  const handleToggleFloodPropagation = useCallback(
    (enabled: boolean) => {
      const map = mapRef.current;
      if (!map) return;

      const present = LAYER_IDS.filter((id) => map.getLayer(id));
      if (present.length === 0) {
        console.warn(
          '[Flood Propagation] Toggle failed - Flood Propagation layers not found'
        );
        return;
      }

      const visibility = enabled ? 'visible' : 'none';
      present.forEach((id) =>
        map.setLayoutProperty(id, 'visibility', visibility)
      );

      setIsFloodPropagationActive(enabled);
      const animator = getAnimator();
      animator.setEnabled(enabled);
      animator.stop();
      if (enabled) animator.start();

      // Force map to repaint
      map.triggerRepaint();
    },
    [mapRef, getAnimator]
  );

  /** Show the heatmap again if its switch is on (it survives going back). */
  const restoreFloodPropagationLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map || !isFloodPropagationActive) return;

    LAYER_IDS.filter((id) => map.getLayer(id)).forEach((id) =>
      map.setLayoutProperty(id, 'visibility', 'visible')
    );
    getAnimator().start();
  }, [mapRef, getAnimator, isFloodPropagationActive]);

  return {
    isFloodPropagationActive,
    updateFloodPropagation,
    handleToggleFloodPropagation,
    restoreFloodPropagationLayers,
  };
}
