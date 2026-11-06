import { describe, expect, it } from 'vitest';

import {
  HAZARD_BANDS,
  HAZARD_FALLBACK_COLORS,
  getColorForCategory,
  getStrokeColorForCategory,
  hazardBand,
  hazardBandFromColor,
} from './hazard-band';

describe('hazardBand', () => {
  it.each([
    // What a live simulation sends.
    ['High', 'high'],
    ['Medium', 'medium'],
    ['Low', 'low'],
    ['No hazard', 'none'],
    // What the stored scenarios carry.
    ['High Risk', 'high'],
    ['Medium Risk', 'medium'],
    ['Low Risk', 'low'],
    ['No Risk', 'none'],
    // Case and whitespace.
    ['  HIGH RISK\n', 'high'],
  ])('reads %j as %s', (category, level) => {
    expect(hazardBand(category)?.level).toBe(level);
  });

  it.each([[''], ['N/A'], ['unrecognised'], [null], [undefined]])(
    'is null for %j, never a band it is not',
    (category) => {
      expect(hazardBand(category)).toBeNull();
    }
  );

  it('gives every band its own fill, stroke and rgb', () => {
    for (const key of ['fill', 'stroke', 'rgb'] as const) {
      const values = Object.values(HAZARD_BANDS).map((band) => band[key]);
      expect(new Set(values).size).toBe(4);
    }
  });
});

describe('category colours', () => {
  it('fill and stroke land in the same band', () => {
    for (const band of Object.values(HAZARD_BANDS)) {
      expect(getColorForCategory(band.label)).toBe(band.fill);
      expect(getStrokeColorForCategory(band.label)).toBe(band.stroke);
    }
  });

  it('fall back for an unknown category', () => {
    expect(getColorForCategory('something else')).toBe(
      HAZARD_FALLBACK_COLORS.fill
    );
    expect(getStrokeColorForCategory('')).toBe(HAZARD_FALLBACK_COLORS.stroke);
  });
});

describe('hazardBandFromColor', () => {
  it('recognises each exact palette colour, as rgb or hex', () => {
    for (const band of Object.values(HAZARD_BANDS)) {
      expect(hazardBandFromColor(band.rgb)?.level).toBe(band.level);
      expect(hazardBandFromColor(band.fill)?.level).toBe(band.level);
    }
  });

  it('puts an interpolated colour in the nearest band', () => {
    expect(hazardBandFromColor('rgb(230, 60, 40)')?.level).toBe('high');
    expect(hazardBandFromColor('rgb(250, 240, 120)')?.level).toBe('low');
    expect(hazardBandFromColor('rgb(80, 140, 50)')?.level).toBe('none');
  });

  it('is null for a colour it cannot read', () => {
    expect(hazardBandFromColor('not a colour')).toBeNull();
    expect(hazardBandFromColor('')).toBeNull();
  });
});
