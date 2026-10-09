import type mapboxgl from 'mapbox-gl';
import type {
  Drain,
  Inlet,
  Outlet,
  Pipe,
} from '@/components/control-panel/types';

/** The layers a click on the simulation map can land on. */
const CLICKABLE_LAYERS = [
  'inlets-layer',
  'outlets-layer',
  'storm_drains-layer',
  'man_pipes-layer',
];

/** What the page does in answer to the map, as of its latest render. */
export interface SimulationMapHandlers {
  /** Clicks and the pointer cursor do nothing until simulation mode is on. */
  isSimulationActive: boolean;
  onEmptyClick: () => void;
  selectPipe: (pipe: Pipe) => void;
  selectInlet: (inlet: Inlet) => void;
  selectOutlet: (outlet: Outlet) => void;
  selectDrain: (drain: Drain) => void;
}

/**
 * How the handlers reach the page. They are registered once, when the map
 * is created, so everything is read at the moment of the click.
 */
export interface SimulationInteractionSources {
  handlers: () => SimulationMapHandlers | null;
  inlets: () => Inlet[];
  outlets: () => Outlet[];
  pipes: () => Pipe[];
  drains: () => Drain[];
}

/**
 * Register the simulation map's click and hover handlers.
 *
 * A click selects the topmost drainage component under the pointer, or
 * reports an empty click. Call once per map.
 */
export function registerSimulationInteractions(
  map: mapboxgl.Map,
  layerIds: readonly string[],
  sources: SimulationInteractionSources
): void {
  map.on('click', (e) => {
    const handlers = sources.handlers();
    if (!handlers?.isSimulationActive) return;

    const validLayers = CLICKABLE_LAYERS.filter((id) => map.getLayer(id));

    if (!validLayers.length) return;

    const features = map.queryRenderedFeatures(e.point, {
      layers: validLayers,
    });

    if (!features.length) {
      handlers.onEmptyClick();
      return;
    }

    const feature = features[0];
    const props = feature.properties || {};
    if (!feature.layer) return;

    switch (feature.layer.id) {
      case 'man_pipes-layer': {
        const pipe = sources.pipes().find((p) => p.id === props.Name);
        if (pipe) handlers.selectPipe(pipe);
        break;
      }
      case 'inlets-layer': {
        const inlet = sources.inlets().find((i) => i.id === props.In_Name);
        if (inlet) handlers.selectInlet(inlet);
        break;
      }
      case 'outlets-layer': {
        const outlet = sources.outlets().find((o) => o.id === props.Out_Name);
        if (outlet) handlers.selectOutlet(outlet);
        break;
      }
      case 'storm_drains-layer': {
        const drain = sources.drains().find((d) => d.id === props.In_Name);
        if (drain) handlers.selectDrain(drain);
        break;
      }
    }
  });

  // Cursor style
  layerIds.forEach((layerId) => {
    map.on('mouseenter', layerId, () => {
      if (sources.handlers()?.isSimulationActive) {
        map.getCanvas().style.cursor = 'pointer';
      }
    });
    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
    });
  });
}
