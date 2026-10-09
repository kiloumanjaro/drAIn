import { describe, expect, it } from 'vitest';
import type {
  NodeParams,
  LinkParams,
} from '@/components/control-panel/tabs/simulation-models/model3';
import {
  panelAfterSelection,
  panelAfterSelectionChange,
  panelAfterToggle,
  withLinkParam,
  withNodeParam,
} from './parameter-panels';

describe('panelAfterSelection', () => {
  it('opens a kind of panel as soon as something of that kind is selected', () => {
    expect(panelAfterSelection(null, 'node', 1)).toBe('node');
    expect(panelAfterSelection(null, 'link', 3)).toBe('link');
  });

  it('switches from the other panel', () => {
    expect(panelAfterSelection('link', 'node', 2)).toBe('node');
    expect(panelAfterSelection('node', 'link', 1)).toBe('link');
  });

  it('closes its own panel when the selection is cleared', () => {
    expect(panelAfterSelection('node', 'node', 0)).toBe(null);
    expect(panelAfterSelection('link', 'link', 0)).toBe(null);
  });

  it('leaves the other panel alone when the selection is cleared', () => {
    expect(panelAfterSelection('link', 'node', 0)).toBe('link');
    expect(panelAfterSelection('node', 'link', 0)).toBe('node');
    expect(panelAfterSelection(null, 'node', 0)).toBe(null);
  });
});

describe('panelAfterSelectionChange', () => {
  const none = { node: 0, link: 0 };

  it('changes nothing while the counts stay the same', () => {
    expect(panelAfterSelectionChange('link', none, none)).toBe('link');
    expect(
      panelAfterSelectionChange(
        null,
        { node: 2, link: 1 },
        { node: 2, link: 1 }
      )
    ).toBe(null);
  });

  it('opens the node panel when a component is added', () => {
    expect(panelAfterSelectionChange(null, none, { node: 1, link: 0 })).toBe(
      'node'
    );
  });

  it('reopens a closed node panel when another component is added', () => {
    expect(
      panelAfterSelectionChange(
        null,
        { node: 1, link: 0 },
        { node: 2, link: 0 }
      )
    ).toBe('node');
  });

  it('does not reopen the node panel because pipes changed', () => {
    // Components are still selected, but only the pipe count moved.
    expect(
      panelAfterSelectionChange(
        'node',
        { node: 2, link: 1 },
        { node: 2, link: 0 }
      )
    ).toBe('node');
    expect(
      panelAfterSelectionChange(
        'link',
        { node: 2, link: 1 },
        { node: 2, link: 0 }
      )
    ).toBe(null);
  });

  it('lets the pipes decide when both counts change at once', () => {
    expect(panelAfterSelectionChange(null, none, { node: 1, link: 1 })).toBe(
      'link'
    );
    expect(
      panelAfterSelectionChange(
        'link',
        { node: 0, link: 1 },
        { node: 1, link: 0 }
      )
    ).toBe('node');
  });

  it('closes whichever panel was open when everything is cleared', () => {
    expect(panelAfterSelectionChange('node', { node: 1, link: 1 }, none)).toBe(
      null
    );
    expect(panelAfterSelectionChange('link', { node: 1, link: 1 }, none)).toBe(
      null
    );
  });
});

describe('panelAfterToggle', () => {
  it('opens a closed panel', () => {
    expect(panelAfterToggle(null, 'node')).toBe('node');
    expect(panelAfterToggle(null, 'link')).toBe('link');
  });

  it('closes the panel that is open', () => {
    expect(panelAfterToggle('node', 'node')).toBe(null);
    expect(panelAfterToggle('link', 'link')).toBe(null);
  });

  it('swaps to the other panel, never showing both', () => {
    expect(panelAfterToggle('link', 'node')).toBe('node');
    expect(panelAfterToggle('node', 'link')).toBe('link');
  });
});

describe('withNodeParam', () => {
  it('starts a node from zeroes, with no invert elevation', () => {
    const next = withNodeParam(new Map(), 'I-1', 'init_depth', 2);
    expect(next.get('I-1')).toEqual({
      init_depth: 2,
      ponding_area: 0,
      surcharge_depth: 0,
    });
    expect(next.get('I-1')).not.toHaveProperty('inv_elev');
  });

  it('keeps what was already set for the node and for other nodes', () => {
    const params = new Map<string, NodeParams>([
      ['I-1', { init_depth: 2, ponding_area: 5, surcharge_depth: 0 }],
      ['I-2', { init_depth: 9, ponding_area: 0, surcharge_depth: 0 }],
    ]);
    const next = withNodeParam(params, 'I-1', 'surcharge_depth', 1);
    expect(next.get('I-1')).toEqual({
      init_depth: 2,
      ponding_area: 5,
      surcharge_depth: 1,
    });
    expect(next.get('I-2')).toBe(params.get('I-2'));
  });

  it('returns a new map and leaves the old one as it was', () => {
    const params = new Map<string, NodeParams>();
    const next = withNodeParam(params, 'I-1', 'init_depth', 2);
    expect(next).not.toBe(params);
    expect(params.size).toBe(0);
  });

  it('does not lose the first of two edits made in a row', () => {
    const once = withNodeParam(new Map(), 'I-1', 'init_depth', 2);
    const twice = withNodeParam(once, 'I-1', 'ponding_area', 7);
    expect(twice.get('I-1')).toMatchObject({ init_depth: 2, ponding_area: 7 });
  });
});

describe('withLinkParam', () => {
  it('starts a pipe from zeroes', () => {
    const next = withLinkParam(new Map(), 'P-1', 'init_flow', 3);
    expect(next.get('P-1')).toEqual({
      init_flow: 3,
      upstrm_offset_depth: 0,
      downstrm_offset_depth: 0,
      avg_conduit_loss: 0,
    });
  });

  it('keeps the other values and leaves the old map as it was', () => {
    const params = new Map<string, LinkParams>([
      [
        'P-1',
        {
          init_flow: 3,
          upstrm_offset_depth: 1,
          downstrm_offset_depth: 0,
          avg_conduit_loss: 0,
        },
      ],
    ]);
    const next = withLinkParam(params, 'P-1', 'avg_conduit_loss', 0.5);
    expect(next.get('P-1')).toEqual({
      init_flow: 3,
      upstrm_offset_depth: 1,
      downstrm_offset_depth: 0,
      avg_conduit_loss: 0.5,
    });
    expect(params.get('P-1')?.avg_conduit_loss).toBe(0);
  });
});
