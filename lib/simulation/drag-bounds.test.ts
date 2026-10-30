import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  KEEP_VISIBLE_LEFT_PART,
  KEEP_VISIBLE_RIGHT_PART,
  KEEP_VISIBLE_TOP_PART,
  MAP_BUTTONS_STRIP,
  MAP_BUTTONS_WIDTH,
  START_MARGIN,
  clampDragPosition,
  measureDragBounds,
  startPosition,
} from './drag-bounds';

// A laptop with the 59px navigation rail to the left of the map.
const bounds = {
  width: 751,
  viewportWidth: 1366,
  viewportHeight: 768,
  originX: 59,
  originY: 0,
};

describe('clampDragPosition', () => {
  it('leaves a position alone while the table is on screen', () => {
    expect(clampDragPosition({ x: 300, y: 120 }, bounds)).toEqual({
      x: 300,
      y: 120,
    });
  });

  it('keeps the search box and some header on screen when dragged right', () => {
    // It used to stop with 10px showing: only the search box, which does
    // not drag, so the table could not be pulled back.
    const { x } = clampDragPosition({ x: 5000, y: 0 }, bounds);
    const visible = bounds.viewportWidth - (bounds.originX + x);
    expect(visible).toBe(KEEP_VISIBLE_LEFT_PART);
  });

  it('keeps the buttons and some header on screen when dragged left', () => {
    const { x } = clampDragPosition({ x: -5000, y: 0 }, bounds);
    const visible = bounds.originX + x + bounds.width;
    expect(visible).toBe(KEEP_VISIBLE_RIGHT_PART);
  });

  it('keeps the header on screen when dragged down, and stops at the top', () => {
    expect(clampDragPosition({ x: 300, y: 5000 }, bounds).y).toBe(
      bounds.viewportHeight - KEEP_VISIBLE_TOP_PART
    );
    expect(clampDragPosition({ x: 300, y: -200 }, bounds).y).toBe(0);
  });

  it('gives one position, not a reversed range, when both kept parts cannot fit', () => {
    const narrow = { ...bounds, width: 300, viewportWidth: 300, originX: 0 };
    expect(clampDragPosition({ x: 500, y: 0 }, narrow).x).toBe(
      clampDragPosition({ x: -500, y: 0 }, narrow).x
    );
  });
});

describe('clampDragPosition with a left limit', () => {
  // A parameter panel: fixed to the screen, so its origin is the screen's,
  // and stopped at the 59px navigation rail.
  const panel = {
    width: 450,
    viewportWidth: 1366,
    viewportHeight: 768,
    originX: 0,
    originY: 0,
    leftLimit: 59,
  };

  it('stops at the navigation rail with the whole header on screen', () => {
    // Without the limit it stopped at 320 - 450 = -130: title off screen,
    // the rest over the rail.
    const { leftLimit: _none, ...unlimited } = panel;
    expect(clampDragPosition({ x: -5000, y: 0 }, unlimited).x).toBe(-130);
    expect(clampDragPosition({ x: -5000, y: 0 }, panel).x).toBe(59);
  });

  it('leaves a position right of the rail alone', () => {
    expect(clampDragPosition({ x: 60, y: 120 }, panel)).toEqual({
      x: 60,
      y: 120,
    });
  });

  it('is measured in the container, for one that does not start at the screen edge', () => {
    const { x } = clampDragPosition(
      { x: -5000, y: 0 },
      { ...panel, originX: 20 }
    );
    expect(20 + x).toBe(59);
  });

  it('changes nothing on the right or at the bottom', () => {
    const { leftLimit: _none, ...unlimited } = panel;
    const wanted = { x: 5000, y: 5000 };
    expect(clampDragPosition(wanted, panel)).toEqual(
      clampDragPosition(wanted, unlimited)
    );
    expect(clampDragPosition(wanted, panel).x).toBe(
      panel.viewportWidth - KEEP_VISIBLE_LEFT_PART
    );
  });

  it('keeps to the left limit on a screen too narrow for both', () => {
    const narrow = { ...panel, viewportWidth: 400 };
    expect(clampDragPosition({ x: 500, y: 0 }, narrow).x).toBe(59);
    expect(clampDragPosition({ x: -500, y: 0 }, narrow).x).toBe(59);
  });
});

describe('measureDragBounds', () => {
  const rect = (left: number, top: number) => ({
    getBoundingClientRect: () => ({ left, top }),
  });

  beforeEach(() => {
    vi.stubGlobal('window', { innerWidth: 1366, innerHeight: 768 });
    vi.stubGlobal('document', {
      // The map area, right of the 59px navigation rail.
      getElementById: (id: string) =>
        id === 'main-content' ? rect(59, 0) : null,
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('gives a table the origin of its container and no left limit', () => {
    const table = {
      offsetWidth: 751,
      parentElement: { offsetParent: rect(59, 0) },
    } as unknown as HTMLElement;
    expect(measureDragBounds(table)).toEqual({
      width: 751,
      viewportWidth: 1366,
      viewportHeight: 768,
      originX: 59,
      originY: 0,
      leftLimit: undefined,
    });
  });

  it('stops a panel fixed to the screen where the map area starts', () => {
    // A fixed wrapper has no offset parent.
    const panel = {
      offsetWidth: 450,
      parentElement: { offsetParent: null },
    } as unknown as HTMLElement;
    const bounds = measureDragBounds(panel);
    expect(bounds).toMatchObject({ originX: 0, originY: 0, leftLimit: 59 });
    expect(clampDragPosition({ x: -5000, y: 0 }, bounds).x).toBe(59);
  });

  it('has no rail to stop at where the map area starts at the screen edge', () => {
    vi.stubGlobal('document', { getElementById: () => rect(0, 0) });
    const panel = {
      offsetWidth: 450,
      parentElement: { offsetParent: null },
    } as unknown as HTMLElement;
    expect(measureDragBounds(panel).leftLimit).toBe(0);
  });

  it('falls back to a plain 500px panel before there is one to measure', () => {
    expect(measureDragBounds(null)).toMatchObject({
      width: 500,
      originX: 0,
      leftLimit: undefined,
    });
  });
});

describe('startPosition', () => {
  // The results table: placed inside the map area, right of the 59px rail.
  const table = {
    width: 500,
    height: 600,
    anchorX: 0.6,
    anchorY: 0.5,
    minWidth: 500,
    fullWidth: 760,
    mapLeft: 59,
    originX: 59,
  };
  // A parameter panel: fixed to the screen, so its origin is the screen's.
  const panel = {
    width: 500,
    height: 600,
    anchorX: 0.5,
    anchorY: 0.5,
    minWidth: 450,
    fullWidth: 600,
    mapLeft: 59,
    originX: 0,
  };
  // The control panel's right edge on screen: rail, margin, 384px.
  const controlPanelRight = 59 + 404;

  it('stays at its anchor on a wide screen', () => {
    const screen = { viewportWidth: 1920, viewportHeight: 1080 };
    expect(startPosition({ ...table, ...screen })).toEqual({ x: 902, y: 240 });
  });

  it('keeps the header on screen when the screen is shorter than the panel', () => {
    // A phone on its side: centring used to give y = 195 - 300 = -105.
    const screen = { viewportWidth: 844, viewportHeight: 390 };
    expect(startPosition({ ...table, ...screen }).y).toBe(START_MARGIN);
    expect(startPosition({ ...panel, ...screen }).y).toBe(START_MARGIN);
  });

  it('starts clear of the control panel and the map buttons on a laptop', () => {
    const screen = { viewportWidth: 1280, viewportHeight: 720 };
    for (const floating of [table, panel]) {
      const { x } = startPosition({ ...floating, ...screen });
      const screenX = floating.originX + x;
      expect(screenX).toBeGreaterThan(controlPanelRight);
      expect(screenX + floating.minWidth).toBeLessThanOrEqual(
        screen.viewportWidth - MAP_BUTTONS_STRIP
      );
    }
  });

  it('leaves room for the full width where the screen has it', () => {
    const screen = { viewportWidth: 1440, viewportHeight: 900 };
    const { x } = startPosition({ ...table, ...screen });
    expect(table.originX + x + table.fullWidth).toBeLessThanOrEqual(
      screen.viewportWidth - MAP_BUTTONS_STRIP
    );
    expect(table.originX + x).toBeGreaterThan(controlPanelRight);
  });

  // Below 1024px the panels are pinned across the top and these positions
  // are not used, so this is the narrowest screen that matters.
  describe('on the narrowest desktop (1024px; below it positions are not used, the panels are pinned)', () => {
    const screen = { viewportWidth: 1024, viewportHeight: 768 };
    const buttonsLeft = screen.viewportWidth - MAP_BUTTONS_STRIP;

    it('starts a parameter panel clear of the control panel and the map buttons', () => {
      const { x, y } = startPosition({ ...panel, ...screen });
      const screenX = panel.originX + x;
      expect(screenX).toBe(controlPanelRight + START_MARGIN);
      expect(screenX + panel.minWidth).toBeLessThanOrEqual(buttonsLeft);
      expect(y).toBeGreaterThanOrEqual(START_MARGIN);
    });

    it('starts the table at the control panel, 9px into the strip and short of the buttons', () => {
      // 500px does not fit in the 491px between the two. It went as far
      // right as the strip allowed, 9px behind the control panel.
      const { x, y } = startPosition({ ...table, ...screen });
      const screenX = table.originX + x;
      expect(screenX).toBe(controlPanelRight);
      expect(screenX + table.minWidth - buttonsLeft).toBe(9);
      expect(screenX + table.minWidth).toBeLessThan(
        screen.viewportWidth - MAP_BUTTONS_WIDTH
      );
      expect(y).toBeGreaterThanOrEqual(START_MARGIN);
    });

    it('gives up the margin beside the control panel before any of the strip', () => {
      // From 1033px the table fits between the two; the margin returns in
      // full at 1053px.
      const { x } = startPosition({ ...table, ...screen, viewportWidth: 1040 });
      const screenX = table.originX + x;
      expect(screenX + table.minWidth).toBe(1040 - MAP_BUTTONS_STRIP);
      expect(screenX).toBeGreaterThan(controlPanelRight);
    });
  });

  it('never starts left of the map area, however narrow the screen', () => {
    const screen = { viewportWidth: 500, viewportHeight: 800 };
    const { x } = startPosition({ ...table, ...screen });
    expect(table.originX + x).toBe(table.mapLeft + START_MARGIN);
  });
});
