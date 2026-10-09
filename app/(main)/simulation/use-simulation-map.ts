import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import mapboxgl from 'mapbox-gl';
import type {
  Drain,
  Inlet,
  Outlet,
  Pipe,
} from '@/components/control-panel/types';
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MAP_BOUNDS,
  MAPBOX_ACCESS_TOKEN,
} from '@/lib/map/config';
import { cancelFloodAppearing } from '@/lib/map/effects/flood-3d-utils';
import { disableRain } from '@/lib/map/effects/rain-utils';
import {
  SIMULATION_BEARING,
  SIMULATION_LAYER_IDS,
  SIMULATION_MAP_STYLE,
  SIMULATION_PITCH,
} from '@/lib/map/simulation-config';
import {
  registerSimulationInteractions,
  type SimulationMapHandlers,
} from '@/lib/map/simulation-interactions';
import { addSimulationLayers } from '@/lib/map/simulation-layers';

interface SimulationMapOptions {
  /** The sidebar is open; the map waits for it to close so it sizes right. */
  sidebarOpen: boolean;
  /** This render's click handlers; read at the moment of a click. */
  handlersRef: RefObject<SimulationMapHandlers | null>;
  inletsRef: RefObject<Inlet[]>;
  outletsRef: RefObject<Outlet[]>;
  pipesRef: RefObject<Pipe[]>;
  drainsRef: RefObject<Drain[]>;
}

/**
 * Creates the simulation map in `mapRef` once the sidebar has closed, with
 * its layers and its click and hover handlers.
 *
 * The page owns `mapRef` and decides when the map goes: `removeMap` is
 * handed back for the page's last effect, so that every other cleanup has
 * run before the map is removed.
 */
export function useSimulationMap(
  mapRef: RefObject<mapboxgl.Map | null>,
  {
    sidebarOpen,
    handlersRef,
    inletsRef,
    outletsRef,
    pipesRef,
    drainsRef,
  }: SimulationMapOptions
) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  // Set when Mapbox can't start (no token, no WebGL); the rest of the page
  // still works.
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    // Only initialize map after sidebar is closed to ensure proper sizing
    if (mapContainerRef.current && !mapRef.current && !sidebarOpen) {
      let map: mapboxgl.Map;
      try {
        map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: SIMULATION_MAP_STYLE,
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          maxBounds: MAP_BOUNDS,
          pitch: SIMULATION_PITCH,
          bearing: SIMULATION_BEARING,
          attributionControl: false,
        });
      } catch (error) {
        // It used to throw out of the effect and take the whole page down.
        console.error('Failed to initialize map:', error);
        // The map can only be made here, in an effect, so this is the one
        // place its failure is known.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMapError(
          'The map could not start. Reload the page, or check the Mapbox token.'
        );
        return;
      }
      mapRef.current = map;

      const addCustomLayers = () => addSimulationLayers(map);

      map.on('load', addCustomLayers);
      map.on('style.load', addCustomLayers);

      registerSimulationInteractions(map, SIMULATION_LAYER_IDS, {
        handlers: () => handlersRef.current,
        inlets: () => inletsRef.current,
        outlets: () => outletsRef.current,
        pipes: () => pipesRef.current,
        drains: () => drainsRef.current,
      });
    }
  }, [
    sidebarOpen,
    mapRef,
    handlersRef,
    inletsRef,
    outletsRef,
    pipesRef,
    drainsRef,
  ]);

  /**
   * Stop the rain and the flood fade-in, then remove the map. Without
   * remove() every visit to this page left a WebGL context and its
   * listeners behind.
   */
  const removeMap = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    disableRain(map);
    cancelFloodAppearing(map);
    map.remove();
    mapRef.current = null;
  }, [mapRef]);

  return { mapContainerRef, mapError, removeMap };
}
