import { describe, expect, it } from 'vitest';
import type {
  Drain,
  Inlet,
  Outlet,
  Pipe,
} from '@/components/control-panel/types';
import {
  calculateDistanceToOutlet,
  calculateDistanceToOutletForDrain,
} from './distance-calculator';

// Coordinates sit on the equator so the maths is easy to check by hand:
// 0.001 degrees of longitude is about 111.2 metres.
const DEG = 111195; // metres per degree at the equator (turf's earth radius)

function makePipe(id: string, coordinates: [number, number][]): Pipe {
  return {
    id,
    TYPE: 'RCP',
    Pipe_Shape: 'circular',
    Pipe_Lngth: 0,
    Height: 0,
    Width: 0,
    Barrels: 1,
    ClogPer: 0,
    ClogTime: 0,
    Mannings: 0.013,
    coordinates,
  };
}

function makeInlet(id: string, coordinates: [number, number]): Inlet {
  return {
    id,
    Inv_Elev: 0,
    MaxDepth: 0,
    Length: 0,
    Height: 0,
    Weir_Coeff: 0,
    In_Type: 0,
    ClogFac: 0,
    ClogTime: 0,
    FPLAIN_080: 0,
    coordinates,
  };
}

function makeOutlet(id: string, coordinates: [number, number]): Outlet {
  return { id, Inv_Elev: 0, AllowQ: 0, FlapGate: 0, coordinates };
}

function makeDrain(id: string, coordinates: [number, number]): Drain {
  return {
    id,
    In_Name: id,
    InvElev: 0,
    clog_per: 0,
    clogtime: 0,
    Weir_coeff: 0,
    Length: 0,
    Height: 0,
    Max_Depth: 0,
    ClogFac: 0,
    NameNum: 0,
    FPLAIN_080: 0,
    coordinates,
  };
}

// A straight pipe A -> B -> C -> D, one segment of 0.001 degrees each.
const A: [number, number] = [0, 0];
const B: [number, number] = [0.001, 0];
const C: [number, number] = [0.002, 0];
const D: [number, number] = [0.003, 0];
const line = [makePipe('p1', [A, B]), makePipe('p2', [B, C, D])];

describe('calculateDistanceToOutlet', () => {
  it('walks the pipe network instead of measuring as the crow flies', () => {
    // Inlet at A, outlet at D: three segments of roughly 111 m each.
    const result = calculateDistanceToOutlet(
      'I-1',
      [makeInlet('I-1', A)],
      [makeOutlet('O-1', D)],
      line
    );
    expect(result.nearestOutlet).toBe('O-1');
    expect(result.distanceToOutlet).toBeCloseTo(0.003 * DEG, -1);
  });

  it('picks the closer of two outlets by network distance', () => {
    const result = calculateDistanceToOutlet(
      'I-1',
      [makeInlet('I-1', B)],
      [makeOutlet('far', D), makeOutlet('near', A)],
      line
    );
    expect(result.nearestOutlet).toBe('near');
    expect(result.distanceToOutlet).toBeCloseTo(0.001 * DEG, -1);
  });

  it('reports a zero distance when the inlet sits on the outlet node', () => {
    const result = calculateDistanceToOutlet(
      'I-1',
      [makeInlet('I-1', A)],
      [makeOutlet('O-1', A)],
      line
    );
    expect(result.nearestOutlet).toBe('O-1');
    expect(result.distanceToOutlet).toBe(0);
  });

  it('returns nulls for an unknown inlet id', () => {
    const result = calculateDistanceToOutlet(
      'nope',
      [makeInlet('I-1', A)],
      [makeOutlet('O-1', D)],
      line
    );
    expect(result).toEqual({
      inletId: 'nope',
      nearestOutlet: null,
      distanceToOutlet: null,
    });
  });

  it('returns nulls when there are no pipes to route through', () => {
    const result = calculateDistanceToOutlet(
      'I-1',
      [makeInlet('I-1', A)],
      [makeOutlet('O-1', D)],
      []
    );
    expect(result.nearestOutlet).toBeNull();
    expect(result.distanceToOutlet).toBeNull();
  });

  it('ignores degenerate single-point pipes', () => {
    const result = calculateDistanceToOutlet(
      'I-1',
      [makeInlet('I-1', A)],
      [makeOutlet('O-1', D)],
      [makePipe('stub', [A])]
    );
    expect(result.nearestOutlet).toBeNull();
  });

  it('returns nulls when there are no outlets', () => {
    const result = calculateDistanceToOutlet(
      'I-1',
      [makeInlet('I-1', A)],
      [],
      line
    );
    expect(result.nearestOutlet).toBeNull();
    expect(result.distanceToOutlet).toBeNull();
  });

  it('snaps an off-network outlet to its nearest pipe node', () => {
    // The outlet is 0.0001 degrees away from D; the walk is still priced
    // to D because routing happens on pipe nodes only.
    const result = calculateDistanceToOutlet(
      'I-1',
      [makeInlet('I-1', A)],
      [makeOutlet('O-1', [0.0031, 0])],
      line
    );
    expect(result.nearestOutlet).toBe('O-1');
    expect(result.distanceToOutlet).toBeCloseTo(0.003 * DEG, -1);
  });

  it('handles two disconnected networks that cannot reach each other', () => {
    // One pipe near the inlet, a separate pipe far away near the outlet.
    const island = [
      makePipe('near-inlet', [A, B]),
      makePipe('near-outlet', [
        [1, 1],
        [1.001, 1],
      ]),
    ];
    const result = calculateDistanceToOutlet(
      'I-1',
      [makeInlet('I-1', A)],
      [makeOutlet('O-1', [1, 1])],
      island
    );
    expect(result.nearestOutlet).toBeNull();
    expect(result.distanceToOutlet).toBeNull();
  });
});

describe('calculateDistanceToOutletForDrain', () => {
  it('routes a storm drain the same way as an inlet', () => {
    const result = calculateDistanceToOutletForDrain(
      'ISD-1',
      [makeDrain('ISD-1', B)],
      [makeOutlet('O-1', D)],
      line
    );
    expect(result.drainId).toBe('ISD-1');
    expect(result.nearestOutlet).toBe('O-1');
    expect(result.distanceToOutlet).toBeCloseTo(0.002 * DEG, -1);
  });

  it('returns nulls for an unknown drain id', () => {
    const result = calculateDistanceToOutletForDrain(
      'missing',
      [makeDrain('ISD-1', B)],
      [makeOutlet('O-1', D)],
      line
    );
    expect(result).toEqual({
      drainId: 'missing',
      nearestOutlet: null,
      distanceToOutlet: null,
    });
  });
});
