import type mapboxgl from 'mapbox-gl';
import { describe, expect, it, vi } from 'vitest';
import { LAYER_IDS } from './config';
import {
  applyFloodProneVisibility,
  applyOverlayVisibility,
} from './visibility';

/** A map that has only the named layers and records what is set on them. */
function makeMap(existingLayers: string[]) {
  const layers = new Set(existingLayers);
  const setLayoutProperty = vi.fn();
  const map = {
    getLayer: (id: string) => (layers.has(id) ? { id } : undefined),
    setLayoutProperty,
  } as unknown as mapboxgl.Map;
  return { map, setLayoutProperty };
}

const EVERY_LAYER = [
  'man_pipes-layer',
  'man_pipes-hit-layer',
  'storm_drains-layer',
  'storm_drains-hit-layer',
  'inlets-layer',
  'inlets-hit-layer',
  'outlets-layer',
  'outlets-hit-layer',
  'flood_hazard-layer',
  'mandaue_population-layer',
  'mandaue_population-fill',
];

const ALL_ON = {
  'man_pipes-layer': true,
  'storm_drains-layer': true,
  'inlets-layer': true,
  'outlets-layer': true,
  'reports-layer': true,
  'flood_hazard-layer': true,
  'mandaue_population-layer': true,
};

describe('applyOverlayVisibility', () => {
  it('shows every layer that is switched on, with its hit layer', () => {
    const { map, setLayoutProperty } = makeMap(EVERY_LAYER);
    applyOverlayVisibility(map, LAYER_IDS, ALL_ON);

    for (const id of EVERY_LAYER) {
      expect(setLayoutProperty).toHaveBeenCalledWith(
        id,
        'visibility',
        'visible'
      );
    }
    expect(setLayoutProperty).toHaveBeenCalledTimes(EVERY_LAYER.length);
  });

  it('hides a layer that is switched off, and its hit layer', () => {
    // The case a base-style switch got wrong: the layers come back with
    // their default visibility, and this is what puts them back.
    const { map, setLayoutProperty } = makeMap(EVERY_LAYER);
    applyOverlayVisibility(map, LAYER_IDS, {
      ...ALL_ON,
      'inlets-layer': false,
    });

    expect(setLayoutProperty).toHaveBeenCalledWith(
      'inlets-layer',
      'visibility',
      'none'
    );
    expect(setLayoutProperty).toHaveBeenCalledWith(
      'inlets-hit-layer',
      'visibility',
      'none'
    );
    expect(setLayoutProperty).toHaveBeenCalledWith(
      'outlets-layer',
      'visibility',
      'visible'
    );
  });

  it('gives the population fill the population switch', () => {
    const { map, setLayoutProperty } = makeMap(EVERY_LAYER);
    applyOverlayVisibility(map, LAYER_IDS, {
      ...ALL_ON,
      'mandaue_population-layer': false,
    });

    expect(setLayoutProperty).toHaveBeenCalledWith(
      'mandaue_population-layer',
      'visibility',
      'none'
    );
    expect(setLayoutProperty).toHaveBeenCalledWith(
      'mandaue_population-fill',
      'visibility',
      'none'
    );
  });

  it('skips layers the style does not have', () => {
    // Before the style has loaded, or for a layer with no hit twin.
    const { map, setLayoutProperty } = makeMap(['flood_hazard-layer']);
    applyOverlayVisibility(map, LAYER_IDS, ALL_ON);

    expect(setLayoutProperty.mock.calls).toEqual([
      ['flood_hazard-layer', 'visibility', 'visible'],
    ]);
  });

  it('never touches the reports switch, which has no map layer', () => {
    const { map, setLayoutProperty } = makeMap([
      ...EVERY_LAYER,
      'reports-layer',
    ]);
    applyOverlayVisibility(map, LAYER_IDS, ALL_ON);

    expect(
      setLayoutProperty.mock.calls.some(([id]) => id === 'reports-layer')
    ).toBe(false);
  });
});

describe('applyFloodProneVisibility', () => {
  it('shows and hides each area by its own switch', () => {
    const { map, setLayoutProperty } = makeMap([
      'lh_prime_area-layer',
      'paknaan_butuanon-layer',
    ]);
    applyFloodProneVisibility(map, {
      lh_prime_area: true,
      paknaan_butuanon: false,
    });

    expect(setLayoutProperty.mock.calls).toEqual([
      ['lh_prime_area-layer', 'visibility', 'visible'],
      ['paknaan_butuanon-layer', 'visibility', 'none'],
    ]);
  });

  it('skips areas whose layer is not on the map', () => {
    const { map, setLayoutProperty } = makeMap([]);
    applyFloodProneVisibility(map, { lh_prime_area: true });

    expect(setLayoutProperty).not.toHaveBeenCalled();
  });
});
