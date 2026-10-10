import { afterEach, describe, expect, it, vi } from 'vitest';
import { COMPACT_MAP_QUERY, isCompactMap } from './compact-map';

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * A window as wide as given, answering `(width < Nrem)` queries the way a
 * browser does at the usual 16px to the rem.
 */
function stubWindow(innerWidth: number) {
  const matchMedia = vi.fn((query: string) => {
    const below = /\(width < (\d+)rem\)/.exec(query);
    return { matches: below !== null && innerWidth < Number(below[1]) * 16 };
  });
  vi.stubGlobal('window', { innerWidth, matchMedia });
  return matchMedia;
}

describe('isCompactMap', () => {
  it('is false on the server', () => {
    expect(isCompactMap()).toBe(false);
  });

  it('asks the browser the shared query', () => {
    const matchMedia = stubWindow(390);
    isCompactMap();
    expect(matchMedia).toHaveBeenCalledWith(COMPACT_MAP_QUERY);
  });

  it('covers phones and tablets, and stops where Tailwind lg starts', () => {
    // 1023.5: a window can be a fraction of a pixel short of lg.
    for (const width of [390, 767, 768, 1023, 1023.5]) {
      stubWindow(width);
      expect(isCompactMap(), `${width}px`).toBe(true);
    }
    for (const width of [1024, 1366]) {
      stubWindow(width);
      expect(isCompactMap(), `${width}px`).toBe(false);
    }
  });
});
