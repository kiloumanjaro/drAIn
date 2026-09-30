import { describe, expect, it } from 'vitest';
import type { Report } from '@/lib/supabase/report';
import { mergeLatestReport } from './latest';

const report = (
  id: string,
  componentId: string,
  date: string,
  extra: Partial<Report> = {}
): Report => ({
  id,
  componentId,
  date,
  category: 'inlets',
  description: '',
  image: '',
  reporterName: 'Anonymous',
  status: 'pending',
  coordinates: [0, 0],
  geocoded_status: 'pending',
  address: '',
  priority: 'low',
  userId: null,
  reviewStatus: 'unreviewed',
  reviewNote: null,
  photoCheck: 'missing',
  photoDistanceM: null,
  photoTakenAt: null,
  ...extra,
});

describe('mergeLatestReport', () => {
  const a1 = report('a1', 'I-1', '2026-09-01T00:00:00Z');
  const b1 = report('b1', 'I-2', '2026-09-02T00:00:00Z');

  it('adds a report on a component with no pin yet', () => {
    const c1 = report('c1', 'I-3', '2026-09-03T00:00:00Z');
    expect(mergeLatestReport([a1, b1], c1)).toEqual([c1, a1, b1]);
  });

  it('replaces the pin with a newer report on the same component', () => {
    const a2 = report('a2', 'I-1', '2026-09-05T00:00:00Z');
    expect(mergeLatestReport([a1, b1], a2)).toEqual([a2, b1]);
  });

  it('keeps the pin when the change is to an older report', () => {
    const a0 = report('a0', 'I-1', '2026-08-01T00:00:00Z', {
      status: 'resolved',
    });
    const latest = [a1, b1];
    expect(mergeLatestReport(latest, a0)).toBe(latest);
  });

  it('updates the pin in place when its own report changes', () => {
    const resolved = { ...a1, status: 'resolved' };
    expect(mergeLatestReport([a1, b1], resolved)).toEqual([resolved, b1]);
  });

  it('asks for a refetch when the pin itself is rejected', () => {
    const rejected = { ...a1, reviewStatus: 'rejected' as const };
    expect(mergeLatestReport([a1, b1], rejected)).toBeNull();
  });

  it('ignores a rejected report that was not a pin', () => {
    const latest = [a1, b1];
    const old = report('a0', 'I-1', '2026-08-01T00:00:00Z', {
      reviewStatus: 'rejected',
    });
    expect(mergeLatestReport(latest, old)).toBe(latest);
  });
});
