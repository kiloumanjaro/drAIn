import { describe, expect, it } from 'vitest';
import { PINNED_PANEL_USEFUL_PX, pinnedPanelCrowded } from './pinned-panels';

describe('pinnedPanelCrowded', () => {
  it('is true on a tablet-width screen too short for a table', () => {
    // Large phones on their sides, and a small tablet on its side.
    for (const height of [360, 390, 430, 600]) {
      expect(pinnedPanelCrowded(true, height), `${height}px`).toBe(true);
    }
  });

  it('is false where a table fits above the half-open sheet', () => {
    for (const height of [768, 1024]) {
      expect(pinnedPanelCrowded(true, height), `${height}px`).toBe(false);
    }
  });

  it('leaves a useful height above the collapsed sheet at 390px high', () => {
    // Pinned 3.25rem down, 8px clear of the 5.25rem bar: 9rem in all.
    expect(390 - 144).toBeGreaterThanOrEqual(PINNED_PANEL_USEFUL_PX);
  });

  it('never asks on a phone or a desktop, which stay as they were', () => {
    expect(pinnedPanelCrowded(false, 390)).toBe(false);
  });
});
