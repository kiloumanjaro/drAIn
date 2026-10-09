import { describe, expect, it } from 'vitest';
import { componentLinkTab, readComponentLink } from './component-link';

describe('readComponentLink', () => {
  it('reads the component and its dataset from the address', () => {
    const params = new URLSearchParams('component=I-12&type=inlets');
    expect(readComponentLink(params)).toEqual({
      type: 'inlets',
      id: 'I-12',
      key: 'inlets:I-12',
    });
  });

  it('gives the same key whatever else the address holds', () => {
    // The tab is in the address too, and changes while the link stays.
    const before = new URLSearchParams('component=I-12&type=inlets');
    const after = new URLSearchParams(
      'component=I-12&type=inlets&activetab=report'
    );
    expect(readComponentLink(after)?.key).toBe(readComponentLink(before)?.key);
  });

  it('tells the same id in two datasets apart', () => {
    const inlet = new URLSearchParams('component=12&type=inlets');
    const drain = new URLSearchParams('component=12&type=storm_drains');
    expect(readComponentLink(inlet)?.key).not.toBe(
      readComponentLink(drain)?.key
    );
  });

  it('is null unless both parts are there', () => {
    expect(readComponentLink(new URLSearchParams(''))).toBeNull();
    expect(readComponentLink(new URLSearchParams('component=I-12'))).toBeNull();
    expect(readComponentLink(new URLSearchParams('type=inlets'))).toBeNull();
    expect(
      readComponentLink(new URLSearchParams('component=&type=inlets'))
    ).toBeNull();
  });
});

describe('componentLinkTab', () => {
  it('opens Admin for staff', () => {
    expect(componentLinkTab(true)).toBe('admin');
  });

  it('opens the details in Stats for everyone else', () => {
    expect(componentLinkTab(false)).toBe('stats');
  });
});
