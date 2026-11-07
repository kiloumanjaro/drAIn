import { describe, expect, it } from 'vitest';

import { findNodeCoordinates, parseNodeId } from './page.helpers';

describe('parseNodeId', () => {
  it('routes ISD- ids to storm drains', () => {
    expect(parseNodeId('ISD-12')).toEqual({
      source: 'storm_drains',
      featureId: 'ISD-12',
    });
  });

  it('routes I- ids to inlets', () => {
    expect(parseNodeId('I-4')).toEqual({ source: 'inlets', featureId: 'I-4' });
  });

  it('checks the ISD- prefix before I-, which it also starts with', () => {
    expect(parseNodeId('ISD-1').source).toBe('storm_drains');
  });

  it('returns nothing for an unrecognised id', () => {
    expect(parseNodeId('X-9')).toEqual({ source: null, featureId: null });
  });
});
describe('findNodeCoordinates', () => {
  const inlets = [
    { id: 'I-1', coordinates: [123.9, 10.3] as [number, number] },
  ];
  const drains = [
    { id: 'ISD-1', coordinates: [123.8, 10.2] as [number, number] },
  ];

  it('finds an inlet among the inlets and a drain among the drains', () => {
    expect(findNodeCoordinates('inlets', 'I-1', inlets, drains)).toEqual([
      123.9, 10.3,
    ]);
    expect(
      findNodeCoordinates('storm_drains', 'ISD-1', inlets, drains)
    ).toEqual([123.8, 10.2]);
  });

  it('looks only in the source it was given', () => {
    expect(findNodeCoordinates('storm_drains', 'I-1', inlets, drains)).toBe(
      null
    );
  });

  it('gives null for an unknown node or source', () => {
    expect(findNodeCoordinates('inlets', 'I-404', inlets, drains)).toBe(null);
    expect(findNodeCoordinates('outlets', 'I-1', inlets, drains)).toBe(null);
  });
});
