import { describe, expect, it } from 'vitest';
import {
  KEEP_VISIBLE_LEFT_PART,
  KEEP_VISIBLE_RIGHT_PART,
  KEEP_VISIBLE_TOP_PART,
  MAP_BUTTONS_STRIP,
  START_MARGIN,
  clampDragPosition,
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

  it('goes as far right as it fits on a tablet, wholly on screen', () => {
    const screen = { viewportWidth: 768, viewportHeight: 1024 };
    for (const floating of [table, panel]) {
      const { x, y } = startPosition({ ...floating, ...screen });
      const screenX = floating.originX + x;
      expect(screenX + floating.minWidth).toBe(
        screen.viewportWidth - MAP_BUTTONS_STRIP
      );
      expect(screenX).toBeGreaterThanOrEqual(floating.mapLeft);
      expect(y).toBeGreaterThanOrEqual(START_MARGIN);
    }
  });

  it('never starts left of the map area, however narrow the screen', () => {
    const screen = { viewportWidth: 500, viewportHeight: 800 };
    const { x } = startPosition({ ...table, ...screen });
    expect(table.originX + x).toBe(table.mapLeft + START_MARGIN);
  });
});
