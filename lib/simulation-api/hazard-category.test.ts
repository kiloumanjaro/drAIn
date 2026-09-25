import { describe, expect, it } from 'vitest';

import { normaliseHazardCategory } from './hazard-category';

describe('normaliseHazardCategory', () => {
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
  ])('reads %j as %s', (category, level) => {
    expect(normaliseHazardCategory(category)).toBe(level);
  });

  it.each([
    ['HIGH', 'high'],
    ['  medium  ', 'medium'],
    ['low risk\n', 'low'],
    ['\thigh RISK', 'high'],
  ])('ignores case and whitespace in %j', (category, level) => {
    expect(normaliseHazardCategory(category)).toBe(level);
  });

  it.each([[''], ['N/A'], [null], [undefined]])(
    'treats %j as no hazard',
    (category) => {
      expect(normaliseHazardCategory(category)).toBe('none');
    }
  );
});
