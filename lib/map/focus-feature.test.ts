import type mapboxgl from 'mapbox-gl';
import { describe, expect, it, vi } from 'vitest';
import type { CameraAnimation } from './focus-feature';
import { focusMapFeature } from './focus-feature';

const camera: CameraAnimation = {
  targetZoom: 18,
  speed: 1.2,
  curve: 1.4,
  essential: true,
  easing: (t) => t,
};

function makeMap() {
  return {
    setFeatureState: vi.fn(),
    flyTo: vi.fn(),
  };
}

describe('focusMapFeature', () => {
  it('marks the feature selected on its own source', () => {
    const map = makeMap();
    focusMapFeature(
      map as unknown as mapboxgl.Map,
      'inlets',
      'I-3',
      [123.94, 10.33],
      camera
    );
    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'inlets', id: 'I-3' },
      { selected: true }
    );
  });

  it('flies the camera to the feature with the given settings', () => {
    const map = makeMap();
    focusMapFeature(
      map as unknown as mapboxgl.Map,
      'outlets',
      'O-1',
      [123.9, 10.3],
      camera
    );
    expect(map.flyTo).toHaveBeenCalledWith({
      center: [123.9, 10.3],
      zoom: 18,
      speed: 1.2,
      curve: 1.4,
      essential: true,
      easing: camera.easing,
    });
  });

  it('derives the layer name from the source for later clearing', () => {
    // Every dataset names its layer "<source>-layer"; the returned
    // selection is what the page stores to un-select the feature later.
    const map = makeMap();
    const selection = focusMapFeature(
      map as unknown as mapboxgl.Map,
      'storm_drains',
      'ISD-7',
      [0, 0],
      camera
    );
    expect(selection).toEqual({
      id: 'ISD-7',
      source: 'storm_drains',
      layer: 'storm_drains-layer',
    });
  });
});
