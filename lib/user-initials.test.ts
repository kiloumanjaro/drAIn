import { describe, expect, it } from 'vitest';
import { getInitials } from './user-initials';

describe('getInitials', () => {
  it('takes the first and last word of a full name', () => {
    expect(getInitials('Juan Dela Cruz')).toBe('JC');
    expect(getInitials('Maria Santos')).toBe('MS');
  });

  it('uses a single letter for a one-word name', () => {
    expect(getInitials('Cher')).toBe('C');
  });

  it('uppercases lowercase names', () => {
    expect(getInitials('juan cruz')).toBe('JC');
  });

  it('falls back to NA when there is no usable name', () => {
    // A profile without a display name still needs an avatar badge.
    expect(getInitials(null)).toBe('NA');
    expect(getInitials(undefined)).toBe('NA');
    expect(getInitials('')).toBe('NA');
    expect(getInitials('   ')).toBe('NA');
  });

  it('survives extra whitespace between and around words', () => {
    expect(getInitials('  Juan   Cruz  ')).toBe('JC');
  });
});
