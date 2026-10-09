import type mapboxgl from 'mapbox-gl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { keepMapSized } from './resize';

/** A ResizeObserver and animation frames the test fires by hand. */
function fakeBrowser() {
  let onResize: () => void = () => {};
  const observe = vi.fn();
  const disconnect = vi.fn();
  const frames = new Map<number, () => void>();
  let nextFrame = 1;

  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        onResize = callback;
      }
      observe = observe;
      disconnect = disconnect;
    }
  );
  vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
    frames.set(nextFrame, callback);
    return nextFrame++;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));

  return {
    observe,
    disconnect,
    containerChanged: () => onResize(),
    runFrame: () => {
      const due = [...frames.values()];
      frames.clear();
      due.forEach((callback) => callback());
    },
  };
}

const container = {} as Element;
const makeMap = () => {
  const resize = vi.fn();
  return { map: { resize } as unknown as mapboxgl.Map, resize };
};

afterEach(() => vi.unstubAllGlobals());

describe('keepMapSized', () => {
  it('resizes the map on the frame after its container changed', () => {
    const browser = fakeBrowser();
    const { map, resize } = makeMap();
    keepMapSized(container, () => map);
    expect(browser.observe).toHaveBeenCalledWith(container);

    browser.containerChanged();
    expect(resize).not.toHaveBeenCalled();
    browser.runFrame();
    expect(resize).toHaveBeenCalledTimes(1);
  });

  it('resizes once for several changes in one frame', () => {
    const browser = fakeBrowser();
    const { map, resize } = makeMap();
    keepMapSized(container, () => map);

    browser.containerChanged();
    browser.containerChanged();
    browser.containerChanged();
    browser.runFrame();
    expect(resize).toHaveBeenCalledTimes(1);

    browser.containerChanged();
    browser.runFrame();
    expect(resize).toHaveBeenCalledTimes(2);
  });

  it('waits for a map that does not exist yet', () => {
    const browser = fakeBrowser();
    const { map, resize } = makeMap();
    let current: mapboxgl.Map | null = null;
    keepMapSized(container, () => current);

    browser.containerChanged();
    browser.runFrame();
    expect(resize).not.toHaveBeenCalled();

    current = map;
    browser.containerChanged();
    browser.runFrame();
    expect(resize).toHaveBeenCalledTimes(1);
  });

  it('stops watching, and drops a resize still waiting for its frame', () => {
    const browser = fakeBrowser();
    const { map, resize } = makeMap();
    const stop = keepMapSized(container, () => map);

    browser.containerChanged();
    stop();
    browser.runFrame();

    expect(browser.disconnect).toHaveBeenCalledTimes(1);
    expect(resize).not.toHaveBeenCalled();
  });

  it('does nothing where there is no ResizeObserver', () => {
    const { map, resize } = makeMap();
    const stop = keepMapSized(container, () => map);
    stop();
    expect(resize).not.toHaveBeenCalled();
  });
});
