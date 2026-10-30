import { describe, expect, it } from 'vitest';
import {
  TOAST_COLORS,
  contrastRatio,
  toastColorVariables,
} from './toast-colors';

describe('contrastRatio', () => {
  it('matches the known extremes', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBe(1);
    // #767676 on white is the usual "just passes AA" grey.
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });
});

describe('TOAST_COLORS', () => {
  it.each(Object.entries(TOAST_COLORS))(
    '%s text meets 4.5:1 on its background',
    (_type, { bg, text }) => {
      expect(contrastRatio(text, bg)).toBeGreaterThanOrEqual(4.5);
    }
  );

  it('gives each type its own background and text', () => {
    const all = Object.values(TOAST_COLORS);
    expect(new Set(all.map((c) => c.bg)).size).toBe(all.length);
    expect(new Set(all.map((c) => c.text)).size).toBe(all.length);
  });
});

describe('toastColorVariables', () => {
  it('names the variables the way sonner reads them', () => {
    const vars = toastColorVariables();
    expect(vars['--error-bg']).toBe(TOAST_COLORS.error.bg);
    expect(vars['--success-text']).toBe(TOAST_COLORS.success.text);
    expect(vars['--normal-border']).toBe(TOAST_COLORS.normal.border);
    expect(Object.keys(vars)).toHaveLength(15);
  });
});
