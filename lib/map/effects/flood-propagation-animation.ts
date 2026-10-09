import type mapboxgl from 'mapbox-gl';

import { wobbleFeatures } from '@/app/(main)/simulation/page.helpers';
import {
  FLOOD_PROPAGATION_LAYERS,
  FLOOD_PROPAGATION_SOURCES,
  type FloodPropagationFeatures,
} from './flood-propagation';

/**
 * Time between redraws: 10 a second. Each redraw hands both sources a whole
 * new FeatureCollection, so this is the cost that matters. The motion is
 * worked out from the clock, so drawing less often does not slow it down.
 */
export const FLOOD_FRAME_INTERVAL_MS = 100;

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export interface FloodAnimationConditions {
  /** The flood-propagation switch is on. */
  enabled: boolean;
  hasMap: boolean;
  /** There are result points to draw. */
  hasFeatures: boolean;
  /** At least one heatmap layer is on the map and not hidden. */
  layerShown: boolean;
  /** The browser tab is in the background. */
  pageHidden: boolean;
  /** The visitor asked their system for less motion. */
  reducedMotion: boolean;
}

/**
 * What the loop should do right now:
 * - `animate`: draw a frame and ask for the next one;
 * - `static`: leave the points where the results put them, and stop;
 * - `idle`: nothing to draw or nobody to see it, so stop.
 */
export type FloodAnimationMode = 'animate' | 'static' | 'idle';

export function floodAnimationMode(
  conditions: FloodAnimationConditions
): FloodAnimationMode {
  const { enabled, hasMap, hasFeatures, layerShown } = conditions;
  if (!enabled || !hasMap || !hasFeatures || !layerShown) return 'idle';
  if (conditions.reducedMotion) return 'static';
  if (conditions.pageHidden) return 'idle';
  return 'animate';
}

/** Whether enough time has passed since the last redraw to draw another. */
export function isFloodFrameDue(
  now: number,
  lastFrameAt: number,
  interval: number = FLOOD_FRAME_INTERVAL_MS
): boolean {
  return now - lastFrameAt >= interval;
}

/** The browser facilities the loop uses, so tests can stand in for them. */
export interface FloodAnimationEnv {
  now: () => number;
  requestFrame: (callback: () => void) => number;
  cancelFrame: (id: number) => void;
  pageHidden: () => boolean;
  reducedMotion: () => boolean;
}

let reducedMotionQuery: MediaQueryList | null = null;

export const browserFloodAnimationEnv: FloodAnimationEnv = {
  now: () => Date.now(),
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (id) => cancelAnimationFrame(id),
  pageHidden: () => document.hidden,
  reducedMotion: () => {
    if (typeof window.matchMedia !== 'function') return false;
    reducedMotionQuery ??= window.matchMedia(REDUCED_MOTION_QUERY);
    return reducedMotionQuery.matches;
  },
};

export interface FloodPropagationAnimator {
  /** The points to animate; read on every frame. */
  setFeatures: (features: FloodPropagationFeatures) => void;
  setEnabled: (enabled: boolean) => void;
  /**
   * Start the loop if it should run and is not running. Safe to call at any
   * time: it works out for itself whether there is anything to animate.
   */
  start: () => void;
  /** Cancel the pending frame, if any. */
  stop: () => void;
  isRunning: () => boolean;
}

function isLayerShown(map: mapboxgl.Map, layerId: string): boolean {
  return (
    Boolean(map.getLayer(layerId)) &&
    map.getLayoutProperty(layerId, 'visibility') !== 'none'
  );
}

/**
 * The pulse-and-wobble loop of the flood-propagation heatmap.
 *
 * A loop is running exactly when a frame is pending, so `isRunning` and
 * `start` can never disagree with what the browser has scheduled: the frame
 * id is cleared as each frame fires and only set again if the loop goes on.
 */
export function createFloodPropagationAnimator(
  getMap: () => mapboxgl.Map | null,
  env: FloodAnimationEnv = browserFloodAnimationEnv
): FloodPropagationAnimator {
  let features: FloodPropagationFeatures = { nodes: [], lines: [] };
  let enabled = true;
  let frame: number | null = null;
  let lastFrameAt = 0;
  // True while the sources hold a wobbled frame rather than the results'
  // own positions.
  let displaced = false;

  const write = (
    map: mapboxgl.Map,
    frameOf: (points: GeoJSON.Feature[]) => GeoJSON.Feature[]
  ) => {
    const targets = [
      [FLOOD_PROPAGATION_SOURCES.nodes, features.nodes],
      [FLOOD_PROPAGATION_SOURCES.lines, features.lines],
    ] as const;
    for (const [sourceId, points] of targets) {
      const source = map.getSource(sourceId) as
        | mapboxgl.GeoJSONSource
        | undefined;
      if (source && points.length > 0) {
        source.setData({
          type: 'FeatureCollection',
          features: frameOf(points),
        });
      }
    }
  };

  const tick = () => {
    // The frame that called this has fired. Every way out below that does
    // not ask for another leaves this null, so `start` can restart the loop.
    frame = null;

    const map = getMap();
    const mode = floodAnimationMode({
      enabled,
      hasMap: map !== null,
      hasFeatures: features.nodes.length > 0 || features.lines.length > 0,
      layerShown:
        map !== null &&
        (isLayerShown(map, FLOOD_PROPAGATION_LAYERS.nodes) ||
          isLayerShown(map, FLOOD_PROPAGATION_LAYERS.lines)),
      pageHidden: env.pageHidden(),
      reducedMotion: env.reducedMotion(),
    });

    if (map === null || mode === 'idle') return;

    if (mode === 'static') {
      // Put the points back where the results have them, once.
      if (displaced) {
        write(map, (points) => points);
        displaced = false;
      }
      return;
    }

    const now = env.now();
    if (isFloodFrameDue(now, lastFrameAt)) {
      lastFrameAt = now;
      write(map, (points) => wobbleFeatures(points, now / 1000));
      displaced = true;
    }
    frame = env.requestFrame(tick);
  };

  return {
    setFeatures: (next) => {
      features = next;
    },
    setEnabled: (next) => {
      enabled = next;
    },
    start: () => {
      // Never two loops at once: only one frame id is kept, so a second
      // loop could not be stopped.
      if (frame === null) tick();
    },
    stop: () => {
      if (frame !== null) {
        env.cancelFrame(frame);
        frame = null;
      }
    },
    isRunning: () => frame !== null,
  };
}
