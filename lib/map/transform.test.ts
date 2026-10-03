import type { FeatureCollection, Point } from 'geojson';
import { describe, expect, it } from 'vitest';
import { mapInletsToDrainagePipes } from './transform';

function collection(
  features: Array<{
    name?: string;
    elev?: number;
    coords?: [number, number];
  }>
): FeatureCollection<Point, { In_Name?: string; Inv_Elev?: number }> {
  return {
    type: 'FeatureCollection',
    features: features.map((f) => ({
      type: 'Feature',
      properties: { In_Name: f.name, Inv_Elev: f.elev },
      geometry: {
        type: 'Point',
        coordinates: f.coords ?? [123.94, 10.33],
      },
    })),
  };
}

describe('mapInletsToDrainagePipes', () => {
  it('returns an empty list for an empty collection', () => {
    expect(mapInletsToDrainagePipes(collection([]))).toEqual([]);
  });

  it('uses the inlet name as id and geocode', () => {
    const [pipe] = mapInletsToDrainagePipes(
      collection([{ name: 'I-3', elev: 10 }])
    );
    expect(pipe.id).toBe('I-3');
    expect(pipe.geocode).toBe('I-3');
  });

  it('falls back to an index-based id when the name is missing', () => {
    const pipes = mapInletsToDrainagePipes(
      collection([{ elev: 10 }, { elev: 10 }])
    );
    expect(pipes.map((p) => p.id)).toEqual(['inlet-0', 'inlet-1']);
  });

  it('rates vulnerability from elevation, with 20 and 30 exclusive bounds', () => {
    const pipes = mapInletsToDrainagePipes(
      collection([
        { name: 'a', elev: 19.9 },
        { name: 'b', elev: 20 }, // exactly 20 stays low
        { name: 'c', elev: 20.1 },
        { name: 'd', elev: 30 }, // exactly 30 stays moderate
        { name: 'e', elev: 30.1 },
      ])
    );
    expect(pipes.map((p) => p.vulnerabilityRating)).toEqual([
      'low',
      'low',
      'moderate',
      'moderate',
      'high',
    ]);
  });

  it('treats a missing elevation as zero (low)', () => {
    const [pipe] = mapInletsToDrainagePipes(collection([{ name: 'I-1' }]));
    expect(pipe.vulnerabilityRating).toBe('low');
  });

  it('writes the location as "lat, lng" with five decimals', () => {
    // GeoJSON stores [lng, lat]; the display string flips the order.
    const [pipe] = mapInletsToDrainagePipes(
      collection([{ name: 'I-1', elev: 1, coords: [123.123456, 10.987654] }])
    );
    expect(pipe.location).toBe('10.98765, 123.12346');
  });
});
