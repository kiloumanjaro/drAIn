import { describe, expect, it } from 'vitest';
import { reportMapHref } from './report-map-href';

describe('reportMapHref', () => {
  it('selects the component when the report has one', () => {
    expect(reportMapHref({ componentId: 'I-12', category: 'inlets' })).toBe(
      '/map?component=I-12&type=inlets'
    );
  });

  it('encodes an id that is not URL-safe', () => {
    expect(
      reportMapHref({ componentId: 'SD 4&5', category: 'storm_drains' })
    ).toBe('/map?component=SD+4%265&type=storm_drains');
  });

  it('opens the report tab when there is no component to select', () => {
    for (const report of [
      { componentId: 'N/A', category: 'inlets' },
      { componentId: '', category: 'inlets' },
      { componentId: null, category: 'inlets' },
      { componentId: 'I-12', category: null },
      { componentId: 'I-12', category: 'not-a-type' },
      {},
    ]) {
      expect(reportMapHref(report)).toBe('/map?activetab=report');
    }
  });
});
