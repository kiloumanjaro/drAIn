import type mapboxgl from 'mapbox-gl';
import { describe, expect, it, vi } from 'vitest';
import { disableRain, enableRain, zoomBasedReveal } from './rain-utils';

// The functions only touch getZoom/setRain, so a tiny stub stands in for
// the real map; no WebGL context is needed.
function mapAtZoom(zoom: number, setRain?: (options: unknown) => void) {
  return { getZoom: () => zoom, setRain } as unknown as mapboxgl.Map;
}

describe('zoomBasedReveal', () => {
  it('hides the effect entirely when zoomed out past 10', () => {
    expect(zoomBasedReveal(mapAtZoom(5), 0.5)).toBe(0);
    expect(zoomBasedReveal(mapAtZoom(10), 0.5)).toBe(0);
  });

  it('reaches the full value at zoom 15 and stays there', () => {
    expect(zoomBasedReveal(mapAtZoom(15), 0.5)).toBe(0.5);
    expect(zoomBasedReveal(mapAtZoom(22), 0.5)).toBe(0.5);
  });

  it('scales linearly in between', () => {
    expect(zoomBasedReveal(mapAtZoom(12.5), 1.0)).toBeCloseTo(0.5);
  });
});

describe('enableRain', () => {
  it('does nothing when the map has no setRain API', () => {
    // Older Mapbox styles lack setRain; enabling rain must not crash them.
    expect(() => enableRain(mapAtZoom(12))).not.toThrow();
  });

  it('passes zoom-scaled density and vignette to setRain', () => {
    const setRain = vi.fn();
    enableRain(mapAtZoom(15, setRain));
    expect(setRain).toHaveBeenCalledTimes(1);
    const options = setRain.mock.calls[0][0];
    expect(options.density).toBe(0.5);
    expect(options.vignette).toBe(1.0);
    expect(options.intensity).toBe(1.0);
  });

  it('swallows a setRain failure instead of crashing the map page', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const setRain = vi.fn(() => {
      throw new Error('boom');
    });
    expect(() => enableRain(mapAtZoom(12, setRain))).not.toThrow();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe('disableRain', () => {
  it('turns the intensity down to zero', () => {
    const setRain = vi.fn();
    disableRain(mapAtZoom(12, setRain));
    expect(setRain).toHaveBeenCalledWith({ intensity: 0 });
  });

  it('stays quiet about the expected style-loading race', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const setRain = vi.fn(() => {
      throw new Error('Style is not done loading');
    });
    expect(() => disableRain(mapAtZoom(12, setRain))).not.toThrow();
    // This error is routine during teardown, so it must not be logged.
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('still reports unexpected failures', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const setRain = vi.fn(() => {
      throw new Error('something else');
    });
    disableRain(mapAtZoom(12, setRain));
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
