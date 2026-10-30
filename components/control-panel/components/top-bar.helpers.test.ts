import { describe, expect, it } from 'vitest';
import { viewLink, withoutScheme } from './top-bar.helpers';

describe('viewLink', () => {
  it('joins the origin and the path', () => {
    expect(viewLink('https://drain.example', '/simulation')).toBe(
      'https://drain.example/simulation'
    );
  });

  it('keeps the query, so the chosen model is part of the link', () => {
    expect(
      viewLink('http://localhost:3000', '/simulation', 'simModel=model2')
    ).toBe('http://localhost:3000/simulation?simModel=model2');
  });

  it('is empty until the origin is known', () => {
    expect(viewLink('', '/simulation', 'simModel=model2')).toBe('');
  });
});

describe('withoutScheme', () => {
  it.each([
    ['https://drain.example/map', 'drain.example/map'],
    ['http://localhost:3000/map?tab=x', 'localhost:3000/map?tab=x'],
    ['', ''],
  ])('%s -> %s', (link, expected) => {
    expect(withoutScheme(link)).toBe(expected);
  });
});
