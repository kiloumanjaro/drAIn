import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LAYER_IDS } from './config';
import {
  INITIAL_OVERLAY_VISIBILITY,
  MAP_LAYER_OVERLAYS_HIDDEN,
  allOverlays,
  anyMapLayerOverlayVisible,
  anyVisible,
  createDebouncedNotice,
} from './overlay-toggles';

describe('overlay switches', () => {
  it('start with everything on except the population overlay', () => {
    expect(INITIAL_OVERLAY_VISIBILITY['mandaue_population-layer']).toBe(false);
    expect(
      Object.entries(INITIAL_OVERLAY_VISIBILITY)
        .filter(([key]) => key !== 'mandaue_population-layer')
        .every(([, on]) => on)
    ).toBe(true);
  });

  it('allOverlays sets every switch, reports included', () => {
    expect(Object.keys(allOverlays(true)).sort()).toEqual(
      Object.keys(INITIAL_OVERLAY_VISIBILITY).sort()
    );
    expect(anyVisible(allOverlays(false))).toBe(false);
    expect(Object.values(allOverlays(true)).every(Boolean)).toBe(true);
  });

  it('hiding the map layers covers every map layer and leaves reports', () => {
    expect(Object.keys(MAP_LAYER_OVERLAYS_HIDDEN).sort()).toEqual(
      [...LAYER_IDS].sort()
    );
    expect(
      { ...allOverlays(true), ...MAP_LAYER_OVERLAYS_HIDDEN }['reports-layer']
    ).toBe(true);
  });
});

describe('anyMapLayerOverlayVisible', () => {
  it('is false when only the report pins are on', () => {
    expect(
      anyMapLayerOverlayVisible({
        ...allOverlays(false),
        'reports-layer': true,
      })
    ).toBe(false);
  });

  it('is true when any other overlay is on', () => {
    expect(
      anyMapLayerOverlayVisible({ ...allOverlays(false), 'inlets-layer': true })
    ).toBe(true);
  });
});

describe('createDebouncedNotice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a notice once the delay has passed', () => {
    const show = vi.fn();
    const notice = createDebouncedNotice(show, 100);
    notice.announce('hidden');

    vi.advanceTimersByTime(99);
    expect(show).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(show.mock.calls).toEqual([['hidden']]);
  });

  it('shows one notice, the last, for several asked for in quick succession', () => {
    const show = vi.fn();
    const notice = createDebouncedNotice(show, 100);
    notice.announce('first');
    vi.advanceTimersByTime(50);
    notice.announce('second');
    vi.advanceTimersByTime(50);
    notice.announce('third');
    vi.advanceTimersByTime(100);

    expect(show.mock.calls).toEqual([['third']]);
  });

  it('shows each of two notices asked for further apart', () => {
    const show = vi.fn();
    const notice = createDebouncedNotice(show, 100);
    notice.announce('first');
    vi.advanceTimersByTime(100);
    notice.announce('second');
    vi.advanceTimersByTime(100);

    expect(show.mock.calls).toEqual([['first'], ['second']]);
  });

  it('shows nothing once cancelled, as when the page is left', () => {
    const show = vi.fn();
    const notice = createDebouncedNotice(show, 100);
    notice.announce('hidden');
    notice.cancel();
    vi.advanceTimersByTime(200);

    expect(show).not.toHaveBeenCalled();
  });
});
