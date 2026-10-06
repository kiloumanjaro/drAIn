import { describe, expect, it } from 'vitest';
import {
  SHEET_DRAG_THRESHOLD,
  cycleSheet,
  sheetAfterDrag,
  sheetHandleLabel,
  stepSheet,
} from './sheet';

describe('stepSheet', () => {
  it('moves one height at a time', () => {
    expect(stepSheet('collapsed', 'up')).toBe('half');
    expect(stepSheet('half', 'up')).toBe('full');
    expect(stepSheet('full', 'down')).toBe('half');
    expect(stepSheet('half', 'down')).toBe('collapsed');
  });

  it('stays put at either end', () => {
    expect(stepSheet('full', 'up')).toBe('full');
    expect(stepSheet('collapsed', 'down')).toBe('collapsed');
  });
});

describe('cycleSheet', () => {
  it('reaches every height from one control', () => {
    expect(cycleSheet('collapsed')).toBe('half');
    expect(cycleSheet('half')).toBe('full');
    expect(cycleSheet('full')).toBe('collapsed');
  });
});

describe('sheetAfterDrag', () => {
  it('treats a small movement as a tap', () => {
    expect(sheetAfterDrag('half', SHEET_DRAG_THRESHOLD - 1)).toBeNull();
    expect(sheetAfterDrag('half', -(SHEET_DRAG_THRESHOLD - 1))).toBeNull();
  });

  it('steps up when dragged up and down when dragged down', () => {
    expect(sheetAfterDrag('half', -120)).toBe('full');
    expect(sheetAfterDrag('half', 120)).toBe('collapsed');
  });

  it('does not move past the ends', () => {
    expect(sheetAfterDrag('full', -200)).toBe('full');
    expect(sheetAfterDrag('collapsed', 200)).toBe('collapsed');
  });
});

describe('sheetHandleLabel', () => {
  it('says what the handle does next', () => {
    expect(sheetHandleLabel('collapsed')).toBe('Open panel');
    expect(sheetHandleLabel('half')).toBe('Expand panel');
    expect(sheetHandleLabel('full')).toBe('Collapse panel');
  });
});
