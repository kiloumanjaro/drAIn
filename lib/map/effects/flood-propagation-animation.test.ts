import type mapboxgl from 'mapbox-gl';
import { describe, expect, it } from 'vitest';
import {
  FLOOD_FRAME_INTERVAL_MS,
  createFloodPropagationAnimator,
  floodAnimationMode,
  isFloodFrameDue,
  type FloodAnimationConditions,
  type FloodAnimationEnv,
} from './flood-propagation-animation';
import {
  FLOOD_PROPAGATION_LAYERS,
  FLOOD_PROPAGATION_SOURCES,
} from './flood-propagation';

const RUNNING: FloodAnimationConditions = {
  enabled: true,
  hasMap: true,
  hasFeatures: true,
  layerShown: true,
  pageHidden: false,
  reducedMotion: false,
};

describe('floodAnimationMode', () => {
  it('animates when the heatmap is on, drawn and in view', () => {
    expect(floodAnimationMode(RUNNING)).toBe('animate');
  });

  it.each([
    ['the switch is off', { enabled: false }],
    ['there is no map', { hasMap: false }],
    ['there are no results', { hasFeatures: false }],
    ['the layers are hidden or missing', { layerShown: false }],
    ['the tab is in the background', { pageHidden: true }],
  ])('is idle when %s', (_name, change) => {
    expect(floodAnimationMode({ ...RUNNING, ...change })).toBe('idle');
  });

  it('holds still when less motion is asked for', () => {
    expect(floodAnimationMode({ ...RUNNING, reducedMotion: true })).toBe(
      'static'
    );
  });

  it('does not redraw a hidden heatmap, even to hold it still', () => {
    expect(
      floodAnimationMode({ ...RUNNING, reducedMotion: true, layerShown: false })
    ).toBe('idle');
  });
});

describe('isFloodFrameDue', () => {
  it('waits out the interval between redraws', () => {
    expect(isFloodFrameDue(1099, 1000)).toBe(false);
    expect(isFloodFrameDue(1100, 1000)).toBe(true);
  });

  it('redraws ten times a second', () => {
    expect(FLOOD_FRAME_INTERVAL_MS).toBe(100);
  });
});

/** A map with the two heatmap sources and layers, recording what is drawn. */
function makeMap({ withLayers = true } = {}) {
  const visibility: Record<string, string> = {};
  const drawn: Record<string, GeoJSON.FeatureCollection[]> = {
    [FLOOD_PROPAGATION_SOURCES.nodes]: [],
    [FLOOD_PROPAGATION_SOURCES.lines]: [],
  };
  let present = withLayers;
  const map = {
    getSource: (id: string) =>
      present
        ? { setData: (data: GeoJSON.FeatureCollection) => drawn[id].push(data) }
        : undefined,
    getLayer: (id: string) => (present ? { id } : undefined),
    getLayoutProperty: (id: string) => visibility[id] ?? 'visible',
  } as unknown as mapboxgl.Map;
  return {
    map,
    drawn,
    addLayers: () => (present = true),
    setVisibility: (value: 'visible' | 'none') => {
      visibility[FLOOD_PROPAGATION_LAYERS.nodes] = value;
      visibility[FLOOD_PROPAGATION_LAYERS.lines] = value;
    },
  };
}

/** A clock and frame queue the test steps by hand. */
function makeEnv() {
  let nextId = 1;
  const pending = new Map<number, () => void>();
  const state = { now: 10_000, hidden: false, reducedMotion: false };
  const env: FloodAnimationEnv = {
    now: () => state.now,
    requestFrame: (callback) => {
      pending.set(nextId, callback);
      return nextId++;
    },
    cancelFrame: (id) => {
      pending.delete(id);
    },
    pageHidden: () => state.hidden,
    reducedMotion: () => state.reducedMotion,
  };
  /** Let `ms` pass, then fire the frames that were waiting. */
  const frame = (ms = 16) => {
    state.now += ms;
    const callbacks = [...pending.values()];
    pending.clear();
    callbacks.forEach((callback) => callback());
  };
  return { env, state, frame, pendingCount: () => pending.size };
}

const point = (lng: number): GeoJSON.Feature => ({
  type: 'Feature',
  properties: { phase: 1, offsetAngle: 0.5, offsetDistance: 0.00009 },
  geometry: { type: 'Point', coordinates: [lng, 10] },
});

const FEATURES = { nodes: [point(120)], lines: [point(121)] };

function setUp(options?: Parameters<typeof makeMap>[0]) {
  const fakeMap = makeMap(options);
  const fakeEnv = makeEnv();
  let current: mapboxgl.Map | null = fakeMap.map;
  const animator = createFloodPropagationAnimator(() => current, fakeEnv.env);
  animator.setFeatures(FEATURES);
  return {
    ...fakeMap,
    ...fakeEnv,
    animator,
    removeMap: () => (current = null),
    nodeFrames: () => fakeMap.drawn[FLOOD_PROPAGATION_SOURCES.nodes],
    lineFrames: () => fakeMap.drawn[FLOOD_PROPAGATION_SOURCES.lines],
  };
}

describe('createFloodPropagationAnimator', () => {
  it('draws both sources at once and keeps going', () => {
    const { animator, nodeFrames, lineFrames, pendingCount } = setUp();
    animator.start();

    expect(nodeFrames()).toHaveLength(1);
    expect(lineFrames()).toHaveLength(1);
    expect(nodeFrames()[0].features[0].properties?.pulseMultiplier).toBeTypeOf(
      'number'
    );
    expect(animator.isRunning()).toBe(true);
    expect(pendingCount()).toBe(1);
  });

  it('redraws no more than once per interval however often frames fire', () => {
    const { animator, nodeFrames, frame } = setUp();
    animator.start();
    for (let i = 0; i < 12; i++) frame(16); // 192 ms of 60 fps frames

    // The first draw, then one at 112 ms; the next is not due until 212 ms.
    expect(nodeFrames()).toHaveLength(2);
    expect(animator.isRunning()).toBe(true);
  });

  it('moves by the clock, not by the number of frames drawn', () => {
    const fast = setUp();
    fast.animator.start();
    for (let i = 0; i < 10; i++) fast.frame(100); // 1 s in 100 ms steps

    const slow = setUp();
    slow.animator.start();
    for (let i = 0; i < 4; i++) slow.frame(250); // 1 s in 250 ms steps

    expect(fast.nodeFrames()).toHaveLength(11);
    expect(slow.nodeFrames()).toHaveLength(5);
    expect(fast.nodeFrames().at(-1)).toEqual(slow.nodeFrames().at(-1));
  });

  it('never runs two loops', () => {
    const { animator, pendingCount } = setUp();
    animator.start();
    animator.start();
    animator.start();
    expect(pendingCount()).toBe(1);
  });

  it('stops when asked, leaving nothing pending', () => {
    const { animator, nodeFrames, frame, pendingCount } = setUp();
    animator.start();
    animator.stop();
    frame(500);

    expect(pendingCount()).toBe(0);
    expect(animator.isRunning()).toBe(false);
    expect(nodeFrames()).toHaveLength(1);
  });

  it('can be started again after it ran into a map with no layers', () => {
    // The loop used to give up here while still looking as if it were
    // running, so nothing ever started it again.
    const { animator, addLayers, nodeFrames } = setUp({ withLayers: false });
    animator.start();
    expect(animator.isRunning()).toBe(false);
    expect(nodeFrames()).toHaveLength(0);

    addLayers();
    animator.start();
    expect(animator.isRunning()).toBe(true);
    expect(nodeFrames()).toHaveLength(1);
  });

  it('stops while the layers are hidden and can be started again', () => {
    const { animator, frame, setVisibility, nodeFrames } = setUp();
    animator.start();
    setVisibility('none');
    frame(200);
    expect(animator.isRunning()).toBe(false);
    expect(nodeFrames()).toHaveLength(1);

    setVisibility('visible');
    animator.start();
    expect(animator.isRunning()).toBe(true);
    expect(nodeFrames()).toHaveLength(2);
  });

  it('does not run while the switch is off', () => {
    const { animator, nodeFrames } = setUp();
    animator.setEnabled(false);
    animator.start();
    expect(animator.isRunning()).toBe(false);
    expect(nodeFrames()).toHaveLength(0);
  });

  it('does not run before there are results', () => {
    const { animator } = setUp();
    animator.setFeatures({ nodes: [], lines: [] });
    animator.start();
    expect(animator.isRunning()).toBe(false);
  });

  it('pauses in a background tab and picks up when started again', () => {
    const { animator, state, frame, nodeFrames } = setUp();
    animator.start();
    state.hidden = true;
    frame(200);
    expect(animator.isRunning()).toBe(false);
    expect(nodeFrames()).toHaveLength(1);

    state.hidden = false;
    frame(5000);
    animator.start();
    expect(animator.isRunning()).toBe(true);
    expect(nodeFrames()).toHaveLength(2);
  });

  it('stops once the map is gone', () => {
    const { animator, removeMap, frame, pendingCount } = setUp();
    animator.start();
    removeMap();
    frame(200);
    expect(animator.isRunning()).toBe(false);
    expect(pendingCount()).toBe(0);
  });

  it('draws nothing itself when less motion is asked for', () => {
    // The results are already on the map, unmoved; there is nothing to add.
    const { animator, state, nodeFrames, lineFrames } = setUp();
    state.reducedMotion = true;
    animator.start();
    expect(animator.isRunning()).toBe(false);
    expect(nodeFrames()).toHaveLength(0);
    expect(lineFrames()).toHaveLength(0);
  });

  it('puts the points back once when less motion is asked for mid-loop', () => {
    const { animator, state, frame, nodeFrames, lineFrames } = setUp();
    animator.start();
    state.reducedMotion = true;
    frame(200);

    expect(animator.isRunning()).toBe(false);
    expect(nodeFrames()).toHaveLength(2);
    expect(nodeFrames()[1].features).toEqual(FEATURES.nodes);
    expect(lineFrames()[1].features).toEqual(FEATURES.lines);

    animator.start();
    expect(nodeFrames()).toHaveLength(2);
  });

  it('leaves a source with no points alone', () => {
    const { animator, nodeFrames, lineFrames } = setUp();
    animator.setFeatures({ nodes: FEATURES.nodes, lines: [] });
    animator.start();
    expect(nodeFrames()).toHaveLength(1);
    expect(lineFrames()).toHaveLength(0);
  });

  it('does not change the features it was given', () => {
    const { animator, frame } = setUp();
    const before = structuredClone(FEATURES);
    animator.start();
    frame(200);
    expect(FEATURES).toEqual(before);
  });
});
