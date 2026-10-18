import { describe, expect, it, vi } from 'vitest';
import type mapboxgl from 'mapbox-gl';
import { endPinRestWatch, settlePinAtRest } from './pin-rest-watch';

/** Just enough of a map to watch: records its listeners. */
function fakeMap() {
  const listeners = new Map<string, Set<() => void>>();
  const on = (type: string, fn: () => void) => {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type)!.add(fn);
  };
  const fake = {
    listeners,
    on,
    once: on,
    off: (type: string, fn: () => void) => listeners.get(type)?.delete(fn),
    isMoving: () => false,
    // The pin is always 50 px off its rest at (0, 0), so a check corrects.
    project: () => ({ x: 50, y: 0 }),
    unproject: () => ({ toArray: () => [0, 0] }),
    getCenter: () => ({ toArray: () => [0, 0] }),
    easeTo: vi.fn(),
    fire: (type: string) => listeners.get(type)?.forEach((fn) => fn()),
    count: () => [...listeners.values()].reduce((n, set) => n + set.size, 0),
  };
  return { fake, map: fake as unknown as mapboxgl.Map };
}

describe('pin rest watch', () => {
  it('listens for idle and movestart while it watches', () => {
    const { fake, map } = fakeMap();
    settlePinAtRest(map, [0, 0], { x: 0, y: 0 });
    expect(fake.listeners.get('idle')?.size).toBe(1);
    expect(fake.listeners.get('movestart')?.size).toBe(1);
    fake.fire('idle');
    expect(fake.easeTo).toHaveBeenCalledTimes(1);
  });

  it('stops listening and moving once ended', () => {
    const { fake, map } = fakeMap();
    settlePinAtRest(map, [0, 0], { x: 0, y: 0 });
    endPinRestWatch(map);
    expect(fake.count()).toBe(0);
    fake.fire('idle');
    expect(fake.easeTo).not.toHaveBeenCalled();
  });

  it('does nothing on a map with no watch', () => {
    const { fake, map } = fakeMap();
    expect(() => endPinRestWatch(map)).not.toThrow();
    expect(fake.count()).toBe(0);
  });
});
