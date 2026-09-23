import { describe, expect, it } from 'vitest';

import { ALL_FLOOD_PRONE_HIDDEN, FLOOD_PRONE_AREAS } from './flood-prone-areas';

describe('FLOOD_PRONE_AREAS', () => {
  it('gives every area a unique id', () => {
    const ids = FLOOD_PRONE_AREAS.map((area) => area.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every area a name, file and colour', () => {
    for (const area of FLOOD_PRONE_AREAS) {
      expect(area.name).not.toBe('');
      expect(area.file).toMatch(/\.geojson$/);
      expect(area.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('gives every area a distinct colour so the legend is readable', () => {
    const colors = FLOOD_PRONE_AREAS.map((area) => area.color);
    expect(new Set(colors).size).toBe(colors.length);
  });
});

describe('ALL_FLOOD_PRONE_HIDDEN', () => {
  it('covers exactly the configured areas', () => {
    expect(Object.keys(ALL_FLOOD_PRONE_HIDDEN).sort()).toEqual(
      FLOOD_PRONE_AREAS.map((area) => area.id).sort()
    );
  });

  it('hides all of them', () => {
    expect(
      Object.values(ALL_FLOOD_PRONE_HIDDEN).every((v) => v === false)
    ).toBe(true);
  });
});
