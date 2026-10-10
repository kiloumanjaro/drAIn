import type mapboxgl from 'mapbox-gl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { keepAttributionOnShow } from './attribution';

/** A window whose layout the test switches by hand. */
function fakeWindow(compact: boolean) {
  const listeners = new Set<() => void>();
  const layout = {
    matches: compact,
    addEventListener: (_: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      listeners.delete(listener),
  };
  vi.stubGlobal('window', { matchMedia: () => layout });
  return {
    listening: () => listeners.size,
    setCompact: (next: boolean) => {
      layout.matches = next;
      [...listeners].forEach((listener) => listener());
    },
  };
}

/** A map that records what is done with its controls, in order. */
function fakeMap() {
  const calls: string[] = [];
  let onRemove: () => void = () => {};
  const map = {
    addControl: (_: unknown, corner: string) => calls.push(`add ${corner}`),
    removeControl: () => calls.push('remove'),
    once: (event: string, listener: () => void) => {
      if (event === 'remove') onRemove = listener;
    },
  } as unknown as mapboxgl.Map;
  return { map, calls, remove: () => onRemove() };
}

const attribution = {} as mapboxgl.AttributionControl;

afterEach(() => vi.unstubAllGlobals());

describe('keepAttributionOnShow', () => {
  it('starts top left under a sheet, bottom right otherwise', () => {
    fakeWindow(true);
    const compact = fakeMap();
    keepAttributionOnShow(compact.map, attribution);
    expect(compact.calls).toEqual(['add top-left']);

    fakeWindow(false);
    const desktop = fakeMap();
    keepAttributionOnShow(desktop.map, attribution);
    expect(desktop.calls).toEqual(['add bottom-right']);
  });

  it('moves to the other corner each time the layout changes', () => {
    const browser = fakeWindow(false);
    const { map, calls } = fakeMap();
    keepAttributionOnShow(map, attribution);

    browser.setCompact(true);
    browser.setCompact(false);
    expect(calls).toEqual([
      'add bottom-right',
      'remove',
      'add top-left',
      'remove',
      'add bottom-right',
    ]);
  });

  it('stops when the map is removed', () => {
    const browser = fakeWindow(true);
    const { map, calls, remove } = fakeMap();
    keepAttributionOnShow(map, attribution);
    expect(browser.listening()).toBe(1);

    remove();
    expect(browser.listening()).toBe(0);
    browser.setCompact(false);
    expect(calls).toEqual(['add top-left']);
  });
});
