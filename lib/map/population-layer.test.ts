import type mapboxgl from 'mapbox-gl';
import { describe, expect, it, vi } from 'vitest';
import {
  clearPopulationSelection,
  registerPopulationInteractions,
  type PopulationSelection,
} from './population-layer';

type Handler = (event: unknown) => void;

/**
 * A map that keeps the handlers registered on it so a test can fire them.
 * Layer-scoped handlers are keyed "type:layer", map-wide ones by type.
 * `featuresAtClick` are the barangays under a click, `componentsAtClick`
 * the drainage components.
 */
function makeMap({
  featuresAtClick = [] as unknown[],
  componentsAtClick = [] as unknown[],
} = {}) {
  const handlers = new Map<string, Handler[]>();
  const canvas = { style: { cursor: '' } };
  const setFeatureState = vi.fn();
  const map = {
    on: (type: string, layerOrFn: string | Handler, fn?: Handler) => {
      const key = typeof layerOrFn === 'string' ? `${type}:${layerOrFn}` : type;
      const handler = typeof layerOrFn === 'string' ? fn! : layerOrFn;
      handlers.set(key, [...(handlers.get(key) ?? []), handler]);
    },
    getCanvas: () => canvas,
    getLayer: (id: string) => ({ id }),
    queryRenderedFeatures: (_point: unknown, options: { layers: string[] }) =>
      options.layers.includes('mandaue_population-fill')
        ? featuresAtClick
        : componentsAtClick,
    setFeatureState,
  } as unknown as mapboxgl.Map;
  const fire = (key: string, event: unknown = {}) =>
    (handlers.get(key) ?? []).forEach((handler) => handler(event));
  return { map, fire, setFeatureState, canvas };
}

const MOVE = 'mousemove:mandaue_population-fill';
const LEAVE = 'mouseleave:mandaue_population-fill';
const CLICK = 'click:mandaue_population-fill';
const over = (id: string) => ({ features: [{ id, properties: {} }] });

function setUp(options?: Parameters<typeof makeMap>[0]) {
  const fake = makeMap(options);
  const selection: PopulationSelection = { clickedId: null, popup: null };
  let visible = true;
  registerPopulationInteractions(fake.map, selection, () => visible);
  return { ...fake, selection, setVisible: (v: boolean) => (visible = v) };
}

describe('population hover', () => {
  it('highlights the barangay under the pointer', () => {
    const { fire, setFeatureState, canvas } = setUp();
    fire(MOVE, over('Basak'));

    expect(setFeatureState.mock.calls).toEqual([
      [{ source: 'mandaue_population', id: 'Basak' }, { hover: true }],
    ]);
    expect(canvas.style.cursor).toBe('pointer');
  });

  it('sets nothing again while the pointer stays on the same barangay', () => {
    const { fire, setFeatureState } = setUp();
    fire(MOVE, over('Basak'));
    fire(MOVE, over('Basak'));
    fire(MOVE, over('Basak'));

    expect(setFeatureState).toHaveBeenCalledTimes(1);
  });

  it('moves the highlight when the pointer crosses into another barangay', () => {
    const { fire, setFeatureState } = setUp();
    fire(MOVE, over('Basak'));
    fire(MOVE, over('Tipolo'));

    expect(setFeatureState.mock.calls.slice(1)).toEqual([
      [{ source: 'mandaue_population', id: 'Basak' }, { hover: false }],
      [{ source: 'mandaue_population', id: 'Tipolo' }, { hover: true }],
    ]);
  });

  it('clears the highlight when the pointer leaves, and sets it on return', () => {
    const { fire, setFeatureState, canvas } = setUp();
    fire(MOVE, over('Basak'));
    fire(LEAVE);
    expect(setFeatureState).toHaveBeenLastCalledWith(
      { source: 'mandaue_population', id: 'Basak' },
      { hover: false }
    );
    expect(canvas.style.cursor).toBe('');

    fire(MOVE, over('Basak'));
    expect(setFeatureState).toHaveBeenLastCalledWith(
      { source: 'mandaue_population', id: 'Basak' },
      { hover: true }
    );
  });

  it('highlights the same barangay again after a style change', () => {
    // The new style's source has no feature state, so the id check alone
    // would leave the barangay under the pointer unhighlighted.
    const { fire, setFeatureState } = setUp();
    fire(MOVE, over('Basak'));
    fire('style.load');
    fire(MOVE, over('Basak'));

    expect(setFeatureState.mock.calls).toEqual([
      [{ source: 'mandaue_population', id: 'Basak' }, { hover: true }],
      [{ source: 'mandaue_population', id: 'Basak' }, { hover: true }],
    ]);
  });

  it('does nothing while the overlay is switched off', () => {
    const { fire, setFeatureState, canvas, setVisible } = setUp();
    setVisible(false);
    fire(MOVE, over('Basak'));
    fire(LEAVE);

    expect(setFeatureState).not.toHaveBeenCalled();
    expect(canvas.style.cursor).toBe('');
  });
});

describe('click on a barangay', () => {
  it('leaves the click to a drainage component under it', () => {
    // No popup can be built here (there is no document), so getting through
    // without a throw is itself the sign that none was.
    const { fire, setFeatureState, selection } = setUp({
      componentsAtClick: [{ id: 'I-12' }],
    });

    fire(CLICK, { ...over('Basak'), point: { x: 1, y: 1 } });

    expect(setFeatureState).not.toHaveBeenCalled();
    expect(selection).toEqual({ clickedId: null, popup: null });
  });

  it('closes an earlier popup when a drainage component takes the click', () => {
    const { fire, setFeatureState, selection } = setUp({
      componentsAtClick: [{ id: 'I-12' }],
    });
    const popup = { remove: vi.fn() };
    selection.clickedId = 'Tipolo';
    selection.popup = popup as unknown as mapboxgl.Popup;

    fire(CLICK, { ...over('Basak'), point: { x: 1, y: 1 } });

    expect(setFeatureState.mock.calls).toEqual([
      [{ source: 'mandaue_population', id: 'Tipolo' }, { clicked: false }],
    ]);
    expect(popup.remove).toHaveBeenCalledTimes(1);
    expect(selection).toEqual({ clickedId: null, popup: null });
  });

  it('selects the barangay when no drainage component is under the click', () => {
    const { fire, setFeatureState } = setUp();

    // It goes on to build the popup, which needs a document.
    expect(() =>
      fire(CLICK, { ...over('Basak'), point: { x: 1, y: 1 } })
    ).toThrow();
    expect(setFeatureState.mock.calls).toEqual([
      [{ source: 'mandaue_population', id: 'Basak' }, { clicked: true }],
    ]);
  });

  it('does nothing while the overlay is switched off', () => {
    const { fire, setFeatureState, setVisible } = setUp();
    setVisible(false);

    fire(CLICK, { ...over('Basak'), point: { x: 1, y: 1 } });

    expect(setFeatureState).not.toHaveBeenCalled();
  });
});

describe('click outside the population areas', () => {
  it('un-selects the clicked barangay and closes its popup', () => {
    const { fire, setFeatureState, selection } = setUp({ featuresAtClick: [] });
    const popup = { remove: vi.fn() };
    selection.clickedId = 'Basak';
    selection.popup = popup as unknown as mapboxgl.Popup;

    fire('click', { point: { x: 1, y: 1 } });

    expect(setFeatureState).toHaveBeenCalledWith(
      { source: 'mandaue_population', id: 'Basak' },
      { clicked: false }
    );
    expect(selection.clickedId).toBeNull();
    expect(popup.remove).toHaveBeenCalledTimes(1);
  });

  it('leaves the selection alone when the click is on a barangay', () => {
    const { fire, setFeatureState, selection } = setUp({
      featuresAtClick: [{ id: 'Tipolo' }],
    });
    selection.clickedId = 'Basak';

    fire('click', { point: { x: 1, y: 1 } });

    expect(setFeatureState).not.toHaveBeenCalled();
    expect(selection.clickedId).toBe('Basak');
  });
});

describe('clearPopulationSelection', () => {
  it('un-selects the barangay and forgets the popup', () => {
    const { map, setFeatureState } = makeMap();
    const popup = { remove: vi.fn() };
    const selection: PopulationSelection = {
      clickedId: 'Basak',
      popup: popup as unknown as mapboxgl.Popup,
    };

    clearPopulationSelection(map, selection);

    expect(setFeatureState).toHaveBeenCalledWith(
      { source: 'mandaue_population', id: 'Basak' },
      { clicked: false }
    );
    expect(popup.remove).toHaveBeenCalledTimes(1);
    expect(selection).toEqual({ clickedId: null, popup: null });
  });

  it('does nothing when no barangay is selected', () => {
    const { map, setFeatureState } = makeMap();
    clearPopulationSelection(map, { clickedId: null, popup: null });

    expect(setFeatureState).not.toHaveBeenCalled();
  });
});
