import type mapboxgl from 'mapbox-gl';
import { describe, expect, it, vi } from 'vitest';
import type {
  Drain,
  Inlet,
  Outlet,
  Pipe,
} from '@/components/control-panel/types';
import {
  registerSimulationInteractions,
  type SimulationMapHandlers,
} from './simulation-interactions';

type Handler = (event: unknown) => void;

const LAYER_IDS = [
  'man_pipes-layer',
  'storm_drains-layer',
  'inlets-layer',
  'outlets-layer',
];

/**
 * A map that keeps the handlers registered on it so a test can fire them.
 * Layer-scoped handlers are keyed "type:layer", map-wide ones by type.
 */
function makeMap({
  featuresAtClick = [] as unknown[],
  layers = LAYER_IDS,
} = {}) {
  const handlers = new Map<string, Handler[]>();
  const canvas = { style: { cursor: '' } };
  const queryRenderedFeatures = vi.fn(() => featuresAtClick);
  const map = {
    on: (type: string, layerOrFn: string | Handler, fn?: Handler) => {
      const key = typeof layerOrFn === 'string' ? `${type}:${layerOrFn}` : type;
      const handler = typeof layerOrFn === 'string' ? fn! : layerOrFn;
      handlers.set(key, [...(handlers.get(key) ?? []), handler]);
    },
    getCanvas: () => canvas,
    getLayer: (id: string) => (layers.includes(id) ? { id } : undefined),
    queryRenderedFeatures,
    // One pixel per degree, so a feature's coordinates are its place on screen.
    project: ([x, y]: [number, number]) => ({ x, y }),
  } as unknown as mapboxgl.Map;
  const fire = (key: string, event: unknown = { point: { x: 1, y: 2 } }) =>
    (handlers.get(key) ?? []).forEach((handler) => handler(event));
  return { map, fire, canvas, queryRenderedFeatures, handlers };
}

const INLET = { id: 'I-1' } as Inlet;
const OUTLET = { id: 'O-1' } as Outlet;
const PIPE = { id: 'P-1' } as Pipe;
const DRAIN = { id: 'ISD-1' } as Drain;

/** A rendered feature; a point under the default click unless placed. */
const hit = (
  layerId: string,
  properties: Record<string, string>,
  geometry: { type: string; coordinates: unknown } = {
    type: 'Point',
    coordinates: [1, 2],
  }
) => ({
  layer: { id: layerId },
  properties,
  geometry,
});

function setUp(
  options?: Parameters<typeof makeMap>[0],
  { active = true } = {}
) {
  const fake = makeMap(options);
  const pageHandlers: SimulationMapHandlers = {
    isSimulationActive: active,
    onEmptyClick: vi.fn(),
    selectPipe: vi.fn(),
    selectInlet: vi.fn(),
    selectOutlet: vi.fn(),
    selectDrain: vi.fn(),
  };
  let current: SimulationMapHandlers | null = pageHandlers;
  registerSimulationInteractions(fake.map, LAYER_IDS, {
    handlers: () => current,
    inlets: () => [INLET],
    outlets: () => [OUTLET],
    pipes: () => [PIPE],
    drains: () => [DRAIN],
  });
  return {
    ...fake,
    pageHandlers,
    setHandlers: (next: SimulationMapHandlers | null) => (current = next),
  };
}

describe('simulation map clicks', () => {
  it.each([
    ['man_pipes-layer', { Name: 'P-1' }, 'selectPipe', PIPE],
    ['inlets-layer', { In_Name: 'I-1' }, 'selectInlet', INLET],
    ['outlets-layer', { Out_Name: 'O-1' }, 'selectOutlet', OUTLET],
    ['storm_drains-layer', { In_Name: 'ISD-1' }, 'selectDrain', DRAIN],
  ] as const)(
    'selects the component under a click on %s',
    (layerId, properties, handler, component) => {
      const { fire, pageHandlers } = setUp({
        featuresAtClick: [hit(layerId, properties)],
      });
      fire('click');

      expect(pageHandlers[handler]).toHaveBeenCalledWith(component);
      expect(pageHandlers.onEmptyClick).not.toHaveBeenCalled();
    }
  );

  it('takes the topmost feature when several are under the pointer', () => {
    const { fire, pageHandlers } = setUp({
      featuresAtClick: [
        hit('inlets-layer', { In_Name: 'I-1' }),
        hit('man_pipes-layer', { Name: 'P-1' }),
      ],
    });
    fire('click');

    expect(pageHandlers.selectInlet).toHaveBeenCalledTimes(1);
    expect(pageHandlers.selectPipe).not.toHaveBeenCalled();
  });

  it('takes the nearest of two overlapping symbols, not the topmost', () => {
    // Two circles that overlap at the click: the drain is drawn on top and
    // comes first, but the click is on the inlet's centre.
    const { fire, pageHandlers } = setUp({
      featuresAtClick: [
        hit(
          'storm_drains-layer',
          { In_Name: 'ISD-1' },
          { type: 'Point', coordinates: [4, 2] }
        ),
        hit('inlets-layer', { In_Name: 'I-1' }),
      ],
    });
    fire('click');

    expect(pageHandlers.selectInlet).toHaveBeenCalledWith(INLET);
    expect(pageHandlers.selectDrain).not.toHaveBeenCalled();
  });

  it('gives a click where a pipe ends under a node to the node', () => {
    const { fire, pageHandlers } = setUp({
      featuresAtClick: [
        hit(
          'man_pipes-layer',
          { Name: 'P-1' },
          {
            type: 'LineString',
            coordinates: [
              [1, 2],
              [40, 2],
            ],
          }
        ),
        hit('outlets-layer', { Out_Name: 'O-1' }),
      ],
    });
    fire('click');

    expect(pageHandlers.selectOutlet).toHaveBeenCalledWith(OUTLET);
    expect(pageHandlers.selectPipe).not.toHaveBeenCalled();
  });

  it('reports a click on nothing', () => {
    const { fire, pageHandlers } = setUp({ featuresAtClick: [] });
    fire('click');
    expect(pageHandlers.onEmptyClick).toHaveBeenCalledTimes(1);
  });

  it('selects nothing for a feature the data does not know', () => {
    const { fire, pageHandlers } = setUp({
      featuresAtClick: [hit('inlets-layer', { In_Name: 'I-404' })],
    });
    fire('click');

    expect(pageHandlers.selectInlet).not.toHaveBeenCalled();
    expect(pageHandlers.onEmptyClick).not.toHaveBeenCalled();
  });

  it('ignores clicks until simulation mode is on', () => {
    const { fire, pageHandlers, queryRenderedFeatures } = setUp(
      { featuresAtClick: [hit('inlets-layer', { In_Name: 'I-1' })] },
      { active: false }
    );
    fire('click');

    expect(queryRenderedFeatures).not.toHaveBeenCalled();
    expect(pageHandlers.selectInlet).not.toHaveBeenCalled();
  });

  it('ignores clicks before the page has handed over its handlers', () => {
    const { fire, setHandlers, queryRenderedFeatures } = setUp();
    setHandlers(null);
    fire('click');
    expect(queryRenderedFeatures).not.toHaveBeenCalled();
  });

  it('does nothing while the drainage layers are not on the map', () => {
    const { fire, pageHandlers, queryRenderedFeatures } = setUp({
      layers: [],
    });
    fire('click');

    expect(queryRenderedFeatures).not.toHaveBeenCalled();
    expect(pageHandlers.onEmptyClick).not.toHaveBeenCalled();
  });

  it('asks only about the layers that are on the map', () => {
    const { fire, queryRenderedFeatures } = setUp({
      layers: ['inlets-layer', 'man_pipes-layer'],
    });
    fire('click');

    expect(queryRenderedFeatures).toHaveBeenCalledWith(
      { x: 1, y: 2 },
      { layers: ['inlets-layer', 'man_pipes-layer'] }
    );
  });

  it('uses the handlers of the latest render, not those at registration', () => {
    const { fire, setHandlers, pageHandlers } = setUp({
      featuresAtClick: [hit('inlets-layer', { In_Name: 'I-1' })],
    });
    const later = { ...pageHandlers, selectInlet: vi.fn() };
    setHandlers(later);
    fire('click');

    expect(later.selectInlet).toHaveBeenCalledWith(INLET);
    expect(pageHandlers.selectInlet).not.toHaveBeenCalled();
  });

  it('registers one click handler', () => {
    const { handlers } = setUp();
    expect(handlers.get('click')).toHaveLength(1);
  });
});

describe('simulation map cursor', () => {
  it('shows a pointer over each drainage layer and clears it on leaving', () => {
    const { fire, canvas } = setUp();
    for (const layerId of LAYER_IDS) {
      fire(`mouseenter:${layerId}`);
      expect(canvas.style.cursor).toBe('pointer');
      fire(`mouseleave:${layerId}`);
      expect(canvas.style.cursor).toBe('');
    }
  });

  it('leaves the cursor alone until simulation mode is on', () => {
    const { fire, canvas } = setUp(undefined, { active: false });
    fire('mouseenter:inlets-layer');
    expect(canvas.style.cursor).toBe('');
  });
});
