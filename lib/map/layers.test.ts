import type mapboxgl from 'mapbox-gl';
import { describe, expect, it, vi } from 'vitest';
import { FLOOD_PRONE_AREAS } from './flood-prone-areas';
import { addMapLayers, registerFloodProneHover } from './layers';

/**
 * A map that remembers the sources and layers added to it, as a real one
 * does between style changes, and records every `on` registration.
 */
function makeMap() {
  const sources = new Set<string>();
  const layers = new Set<string>();
  const on = vi.fn();
  const addSource = vi.fn((id: string) => void sources.add(id));
  const addLayer = vi.fn((layer: { id: string }) => void layers.add(layer.id));
  const map = {
    getSource: (id: string) => (sources.has(id) ? { id } : undefined),
    getLayer: (id: string) => (layers.has(id) ? { id } : undefined),
    addSource,
    addLayer,
    setTerrain: vi.fn(),
    on,
  } as unknown as mapboxgl.Map;
  /** What a base-style switch does: every custom source and layer goes. */
  const dropStyle = () => {
    sources.clear();
    layers.clear();
  };
  return { map, on, addSource, addLayer, dropStyle };
}

describe('addMapLayers', () => {
  it('adds nothing the second time it runs on the same style', () => {
    // It runs on both `load` and `style.load`, which both fire at start.
    const { map, addSource, addLayer } = makeMap();
    addMapLayers(map, { floodScenario: '5YR' });
    const sources = addSource.mock.calls.length;
    const layers = addLayer.mock.calls.length;

    addMapLayers(map, { floodScenario: '5YR' });
    expect(addSource).toHaveBeenCalledTimes(sources);
    expect(addLayer).toHaveBeenCalledTimes(layers);
  });

  it('adds a hidden layer for every flood-prone area', () => {
    const { map, addLayer } = makeMap();
    addMapLayers(map, { floodScenario: '5YR' });

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
      addMapLayers(map, { floodScenario: '5YR' });
      dropStyle();
    }
    expect(on).not.toHaveBeenCalled();
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
