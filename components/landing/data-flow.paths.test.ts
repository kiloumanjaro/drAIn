import { describe, expect, it } from 'vitest';

import { MAP_PATHS } from '@/components/landing/data-flow.paths';

describe('MAP_PATHS', () => {
  it('holds the full traced drawing', () => {
    // Guards the extraction from silently losing shapes.
    expect(MAP_PATHS).toHaveLength(297);
    expect(MAP_PATHS.filter((path) => path.decorative)).toHaveLength(33);
  });

  it('gives every entry usable path geometry', () => {
    for (const path of MAP_PATHS) {
      // Absolute (M) or relative (m) moveto both open a valid path.
      expect(path.d).toMatch(/^[Mm]/);
    }
  });

  it('keys interactive paths by a unique index', () => {
    // Hover ids come from the array index, so they cannot collide the way
    // the hand-written `path-N` labels once did.
    const interactive = MAP_PATHS.map((path, index) => ({ path, index }))
      .filter(({ path }) => !path.decorative)
      .map(({ index }) => index);
    expect(new Set(interactive).size).toBe(interactive.length);
    expect(interactive).toHaveLength(264);
  });
});
