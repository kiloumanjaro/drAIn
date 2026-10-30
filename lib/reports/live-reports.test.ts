import { describe, expect, it } from 'vitest';
import { showsLiveReports } from './live-reports';

describe('showsLiveReports', () => {
  it.each(['/', '/docs', '/docs/anything'])('is off on %s', (path) => {
    expect(showsLiveReports(path)).toBe(false);
  });

  it.each(['/map', '/simulation', '/dashboard', '/docsx'])(
    'is on on %s',
    (path) => {
      expect(showsLiveReports(path)).toBe(true);
    }
  );
});
