import { describe, expect, it } from 'vitest';
import { escapeHtml } from './escape-html';

describe('escapeHtml', () => {
  it('leaves harmless text untouched', () => {
    expect(escapeHtml('Mandaue City inlet I-3')).toBe('Mandaue City inlet I-3');
  });

  it('escapes every character that could open a tag or attribute', () => {
    // These values end up in popup innerHTML, so any one of the five
    // characters slipping through would be an XSS hole.
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    );
    expect(escapeHtml("it's & more")).toBe('it&#39;s &amp; more');
  });

  it('escapes repeated characters, not just the first', () => {
    expect(escapeHtml('<<>>')).toBe('&lt;&lt;&gt;&gt;');
  });

  it('stringifies non-string values instead of throwing', () => {
    // GeoJSON properties can be numbers, null or missing entirely.
    expect(escapeHtml(10.5)).toBe('10.5');
    expect(escapeHtml(null)).toBe('null');
    expect(escapeHtml(undefined)).toBe('undefined');
  });
});
