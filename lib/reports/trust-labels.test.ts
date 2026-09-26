import { describe, expect, it } from 'vitest';
import { photoAgeLabel, photoLocationLabel, reviewLabel } from './trust-labels';

describe('photoLocationLabel', () => {
  it('words a match as what the photo says, with the distance', () => {
    expect(photoLocationLabel('match', 3.4)).toEqual({
      text: 'Photo taken 3 m from it',
      tone: 'good',
    });
  });

  it('switches to kilometres past 1,000 m', () => {
    expect(photoLocationLabel('mismatch', 1851)).toEqual({
      text: 'Photo taken 1.9 km away',
      tone: 'bad',
    });
  });

  it('says plainly when the photo had no location', () => {
    expect(photoLocationLabel('missing', null).tone).toBe('neutral');
  });
});

describe('photoAgeLabel', () => {
  const reported = '2026-09-20T10:00:00Z';

  it('stays quiet for a photo taken shortly before the report', () => {
    expect(photoAgeLabel('2026-09-20T08:00:00Z', reported)).toBeNull();
  });

  it('flags a photo taken weeks before', () => {
    expect(photoAgeLabel('2026-08-11T10:00:00Z', reported)).toEqual({
      text: 'Photo taken 40 days before the report',
      tone: 'warn',
    });
  });

  it('flags a photo dated after the report', () => {
    expect(photoAgeLabel('2026-09-25T10:00:00Z', reported)?.tone).toBe('bad');
  });

  it('is null without a photo date', () => {
    expect(photoAgeLabel(null, reported)).toBeNull();
  });
});

describe('reviewLabel', () => {
  it('shows the reason for a rejection', () => {
    expect(reviewLabel('rejected', 'Duplicate of an open report')).toEqual({
      text: 'Rejected: Duplicate of an open report',
      tone: 'bad',
    });
  });

  it('marks unreviewed reports neutrally', () => {
    expect(reviewLabel('unreviewed', null).text).toBe('Not reviewed yet');
  });
});
