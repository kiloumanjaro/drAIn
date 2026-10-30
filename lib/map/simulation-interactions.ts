import type mapboxgl from 'mapbox-gl';
import type {
  Drain,
  Inlet,
  Outlet,
  Pipe,
} from '@/components/control-panel/types';
import { nearestFeature, type HitFeature } from './hit-test';
import { LAYER_COLORS } from './simulation-config';

/** The layers a click on the simulation map can land on. */
const CLICKABLE_LAYERS = [
  'inlets-layer',
  'outlets-layer',
  'storm_drains-layer',
  'man_pipes-layer',
];

/**
 * How far each layer's drawn symbol reaches from its geometry, in pixels: a
 * circle's radius with its border, half a line's width. This map has no
 * wider click targets, so these are the layers that are clicked.
 */
const DRAWN_REACH: Record<string, number> = {
  'man_pipes-layer': LAYER_COLORS.man_pipes.width / 2,
  'storm_drains-layer':
    LAYER_COLORS.storm_drains.radius + LAYER_COLORS.storm_drains.strokeWidth,
  'inlets-layer': LAYER_COLORS.inlets.radius + LAYER_COLORS.inlets.strokeWidth,
  'outlets-layer':
    LAYER_COLORS.outlets.radius + LAYER_COLORS.outlets.strokeWidth,
};

/** The reach of the symbol a feature is drawn as; 0 if unknown. */
function drawnReach(feature: HitFeature): number {
  const layerId = feature.layer?.id;
  return layerId && Object.hasOwn(DRAWN_REACH, layerId)
    ? DRAWN_REACH[layerId]
    : 0;
}

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
 * A click selects the drainage component nearest the pointer of those under
 * it, as on the map page, or reports an empty click. Call once per map.
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

    // Symbols overlap where they crowd together, so several components can
    // be under one click; the nearest is the one meant, not the topmost.
    const feature = nearestFeature(
      features,
      e.point,
      (lngLat) => map.project(lngLat),
      drawnReach
    );
    if (!feature?.layer) return;
    const props = feature.properties || {};

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
