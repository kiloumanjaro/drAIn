import { describe, expect, it } from 'vitest';
import type {
  Drain,
  Inlet,
  Outlet,
  Pipe,
} from '@/components/control-panel/types';
import {
  NO_SELECTION,
  componentAtHitLayer,
  componentCenter,
  findComponent,
  selectionOf,
  type ComponentLists,
} from './component-selection';

// Only the fields these functions read; the rest of each row is irrelevant.
const inlet = { id: 'I-1', coordinates: [123.9, 10.3] } as Inlet;
const outlet = { id: 'O-1', coordinates: [123.8, 10.2] } as Outlet;
const drain = { id: 'ISD-1', coordinates: [123.7, 10.1] } as Drain;
const pipe = {
  id: 'C-1',
  coordinates: [
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
  ],
} as Pipe;

const lists: ComponentLists = {
  inlets: [inlet],
  outlets: [outlet],
  storm_drains: [drain],
  man_pipes: [pipe],
};

describe('findComponent', () => {
  it('finds a component of each dataset by id', () => {
    expect(findComponent(lists, 'inlets', 'I-1')).toEqual({
      type: 'inlets',
      item: inlet,
    });
    expect(findComponent(lists, 'outlets', 'O-1')).toEqual({
      type: 'outlets',
      item: outlet,
    });
    expect(findComponent(lists, 'storm_drains', 'ISD-1')).toEqual({
      type: 'storm_drains',
      item: drain,
    });
    expect(findComponent(lists, 'man_pipes', 'C-1')).toEqual({
      type: 'man_pipes',
      item: pipe,
    });
  });

  it('does not look in another dataset for the id', () => {
    expect(findComponent(lists, 'outlets', 'I-1')).toBeNull();
  });

  it('returns null for a dataset name that is not ours', () => {
    // The name comes from the URL; "constructor" must not reach a prototype.
    expect(findComponent(lists, 'pumps', 'I-1')).toBeNull();
    expect(findComponent(lists, 'constructor', 'I-1')).toBeNull();
  });
});

describe('componentAtHitLayer', () => {
  it('reads the id from the property each GeoJSON file uses', () => {
    expect(
      componentAtHitLayer(lists, 'man_pipes-hit-layer', { Name: 'C-1' })
    ).toEqual({ type: 'man_pipes', item: pipe });
    expect(
      componentAtHitLayer(lists, 'inlets-hit-layer', { In_Name: 'I-1' })
    ).toEqual({ type: 'inlets', item: inlet });
    expect(
      componentAtHitLayer(lists, 'outlets-hit-layer', { Out_Name: 'O-1' })
    ).toEqual({ type: 'outlets', item: outlet });
    expect(
      componentAtHitLayer(lists, 'storm_drains-hit-layer', {
        In_Name: 'ISD-1',
      })
    ).toEqual({ type: 'storm_drains', item: drain });
  });

  it('ignores the id under another dataset’s property name', () => {
    expect(
      componentAtHitLayer(lists, 'outlets-hit-layer', { In_Name: 'O-1' })
    ).toBeNull();
  });

  it('returns null for an unknown layer or an id not yet loaded', () => {
    expect(
      componentAtHitLayer(lists, 'flood_hazard-layer', { Name: 'C-1' })
    ).toBeNull();
    expect(
      componentAtHitLayer(lists, 'inlets-hit-layer', { In_Name: 'I-404' })
    ).toBeNull();
  });
});

describe('componentCenter', () => {
  it('is the point itself for inlets, outlets and drains', () => {
    expect(componentCenter({ type: 'inlets', item: inlet })).toEqual([
      123.9, 10.3,
    ]);
    expect(componentCenter({ type: 'outlets', item: outlet })).toEqual([
      123.8, 10.2,
    ]);
    expect(componentCenter({ type: 'storm_drains', item: drain })).toEqual([
      123.7, 10.1,
    ]);
  });

  it('is the middle vertex of a pipe', () => {
    expect(componentCenter({ type: 'man_pipes', item: pipe })).toEqual([3, 3]);
  });

  it('is null only for a pipe with no line', () => {
    expect(
      componentCenter({
        type: 'man_pipes',
        item: { ...pipe, coordinates: [] },
      })
    ).toBeNull();
  });
});

describe('selectionOf', () => {
  it('holds the one component and nothing else', () => {
    expect(selectionOf({ type: 'storm_drains', item: drain })).toEqual({
      ...NO_SELECTION,
      storm_drains: drain,
    });
  });
});
