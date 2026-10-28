import type mapboxgl from 'mapbox-gl';
import { describe, expect, it, vi } from 'vitest';
import { FLOOD_PRONE_AREAS } from './flood-prone-areas';
import type { FloodHazardManifest } from './flood-hazard-manifest';
import {
  addMapLayers,
  registerFloodProneHover,
  setFloodHazardScenario,
} from './layers';

const manifest: FloodHazardManifest = {
  version: 1,
  scenarios: {
    '5YR': {
      tiles: '/flood-hazard/aaaaaaaaaa/5YR/{z}/{x}/{y}.pbf',
      minzoom: 10,
      maxzoom: 14,
      bounds: [123.8, 10.3, 124.0, 10.5],
      features: 1,
    },
    '100YR': {
      tiles: '/flood-hazard/bbbbbbbbbb/100YR/{z}/{x}/{y}.pbf',
      minzoom: 10,
      maxzoom: 14,
      bounds: [123.8, 10.3, 124.0, 10.5],
      features: 1,
    },
  },
};
const layerOptions = { floodScenario: '5YR', floodHazardManifest: manifest };

/**
 * A map that remembers the sources and layers added to it, as a real one
 * does between style changes, and records every `on` registration.
 */
function makeMap() {
  const sources = new Set<string>();
  /** Layer ids in draw order, with each layer's layout. */
  const layers: { id: string; layout?: Record<string, string> }[] = [];
  const on = vi.fn();
  const addSource = vi.fn((id: string) => void sources.add(id));
  const addLayer = vi.fn(
    (
      layer: { id: string; layout?: Record<string, string> },
      before?: string
    ) => {
      const at = before ? layers.findIndex((l) => l.id === before) : -1;
      layers.splice(at === -1 ? layers.length : at, 0, layer);
    }
  );
  const map = {
    getSource: (id: string) => (sources.has(id) ? { id } : undefined),
    getLayer: (id: string) => layers.find((l) => l.id === id),
    getLayoutProperty: (id: string, name: string) =>
      layers.find((l) => l.id === id)?.layout?.[name],
    getStyle: () => ({ layers }),
    addSource,
    addLayer,
    removeSource: (id: string) => void sources.delete(id),
    removeLayer: (id: string) =>
      void layers.splice(
        layers.findIndex((l) => l.id === id),
        1
      ),
    setTerrain: vi.fn(),
    on,
  } as unknown as mapboxgl.Map;
  /** What a base-style switch does: every custom source and layer goes. */
  const dropStyle = () => {
    sources.clear();
    layers.length = 0;
  };
  return { map, on, addSource, addLayer, layers, dropStyle };
}

describe('addMapLayers', () => {
  it('adds nothing the second time it runs on the same style', () => {
    // It runs on both `load` and `style.load`, which both fire at start.
    const { map, addSource, addLayer } = makeMap();
    addMapLayers(map, layerOptions);
    const sources = addSource.mock.calls.length;
    const layers = addLayer.mock.calls.length;

    addMapLayers(map, layerOptions);
    expect(addSource).toHaveBeenCalledTimes(sources);
    expect(addLayer).toHaveBeenCalledTimes(layers);
  });

  it('adds a hidden layer for every flood-prone area', () => {
    const { map, addLayer } = makeMap();
    addMapLayers(map, layerOptions);

    for (const area of FLOOD_PRONE_AREAS) {
      expect(addLayer).toHaveBeenCalledWith(
        expect.objectContaining({
          id: `${area.id}-layer`,
          layout: { visibility: 'none' },
        })
      );
    }
  });

  it('registers no event handlers, however often the style changes', () => {
    const { map, on, dropStyle } = makeMap();
    for (let i = 0; i < 4; i++) {
      addMapLayers(map, layerOptions);
      dropStyle();
    }
    expect(on).not.toHaveBeenCalled();
  });
});

describe('setFloodHazardScenario', () => {
  it('reads the scenario tiles as a vector source with the flood_hazard layer', () => {
    const { map, addSource, addLayer } = makeMap();
    addMapLayers(map, layerOptions);
    expect(addSource).toHaveBeenCalledWith(
      'flood_hazard',
      expect.objectContaining({
        type: 'vector',
        tiles: [manifest.scenarios['5YR'].tiles],
        minzoom: 10,
        maxzoom: 14,
      })
    );
    expect(addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'flood_hazard-layer',
        'source-layer': 'flood_hazard',
      }),
      undefined
    );
  });

  it('swaps the scenario keeping visibility and layer order', () => {
    const { map, addSource, layers } = makeMap();
    addMapLayers(map, layerOptions);
    const before = layers.map((l) => l.id);
    map.setLayoutProperty = vi.fn();
    const layer = layers.find((l) => l.id === 'flood_hazard-layer')!;
    layer.layout = { visibility: 'none' };

    setFloodHazardScenario(map, manifest, '100YR');

    expect(addSource).toHaveBeenLastCalledWith(
      'flood_hazard',
      expect.objectContaining({ tiles: [manifest.scenarios['100YR'].tiles] })
    );
    expect(layers.map((l) => l.id)).toEqual(before);
    expect(layers.find((l) => l.id === 'flood_hazard-layer')?.layout).toEqual({
      visibility: 'none',
    });
  });

  it('leaves no overlay for a scenario the manifest does not list', () => {
    const { map, layers } = makeMap();
    addMapLayers(map, layerOptions);
    setFloodHazardScenario(map, manifest, '999YR');
    expect(layers.some((l) => l.id === 'flood_hazard-layer')).toBe(false);
    expect(map.getSource('flood_hazard')).toBeUndefined();
  });
});

describe('registerFloodProneHover', () => {
  it('registers one enter and one leave handler per area', () => {
    const { map, on } = makeMap();
    registerFloodProneHover(map);

    for (const area of FLOOD_PRONE_AREAS) {
      const forLayer = on.mock.calls.filter(
        ([, layerId]) => layerId === `${area.id}-layer`
      );
      expect(forLayer.map(([type]) => type).sort()).toEqual([
        'mouseenter',
        'mouseleave',
      ]);
    }
    expect(on).toHaveBeenCalledTimes(FLOOD_PRONE_AREAS.length * 2);
  });
});
