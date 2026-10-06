import { describe, expect, it } from 'vitest';
import {
  KEEP_VISIBLE_LEFT_PART,
  KEEP_VISIBLE_RIGHT_PART,
  KEEP_VISIBLE_TOP_PART,
  clampDragPosition,
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
