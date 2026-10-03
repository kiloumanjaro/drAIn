import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The map's report readers: which view or table they read, which filters
 * they send, and how rows become Reports. A stand-in client records every
 * chained call; awaiting a chain asks `respond` for the result.
 */
const supabase = vi.hoisted(() => {
  type Call = [method: string, ...args: unknown[]];
  type Result = { data: unknown; error?: unknown; count?: number };
  const state: {
    respond: (source: string, calls: Call[]) => Result;
    queries: Array<{ source: string; calls: Call[] }>;
  } = { respond: () => ({ data: [] }), queries: [] };

  function chain(source: string) {
    const calls: Call[] = [];
    state.queries.push({ source, calls });
    const builder: Record<string, unknown> = {};
    for (const method of [
      'select',
      'insert',
      'eq',
      'neq',
      'gte',
      'order',
      'range',
      'limit',
    ]) {
      builder[method] = (...args: unknown[]) => {
        calls.push([method, ...args]);
        return builder;
      };
    }
    builder.then = (
      resolve: (value: Result) => unknown,
      reject: (reason: unknown) => unknown
    ) => Promise.resolve(state.respond(source, calls)).then(resolve, reject);
    return builder;
  }

  return { state, from: (table: string) => chain(table) };
});

/** Records uploads and removals, so cleanup after a failure is checkable. */
const storage = vi.hoisted(() => {
  const calls: Array<{ method: string; bucket: string; path: string }> = [];
  return {
    calls,
    from: (bucket: string) => ({
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
      upload: async (path: string) => {
        calls.push({ method: 'upload', bucket, path });
        return { error: null };
      },
      remove: async (paths: string[]) => {
        calls.push({ method: 'remove', bucket, path: paths[0] });
        return { error: null };
      },
    }),
  };
});

vi.mock('@/lib/supabase/client', () => ({
  default: {
    from: supabase.from,
    storage: { from: storage.from },
  },
}));

// uploadReport re-encodes the photo through a canvas, which the test
// runtime lacks; the upload itself is what's under test here.
vi.mock('@/lib/reports/sanitize-image', () => ({
  sanitizeImage: async (file: File) => file,
}));

import {
  fetchLatestReportsPerComponent,
  fetchReportCountsByDay,
  fetchReportList,
  uploadReport,
} from './report';

const row = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  created_at: '2026-09-01T00:00:00Z',
  category: 'inlets',
  component_id: 'I-1',
  status: 'pending',
  priority: 'low',
  review_status: 'unreviewed',
  photo_check: 'missing',
  long: 123.9,
  lat: 10.3,
  ...extra,
});

beforeEach(() => {
  supabase.state.respond = () => ({ data: [] });
  supabase.state.queries = [];
  storage.calls.length = 0;
});

describe('fetchLatestReportsPerComponent', () => {
  it('reads the database view, one row per component', async () => {
    supabase.state.respond = () => ({
      data: [row('a'), row('b', { component_id: 'I-2' })],
    });

    const latest = await fetchLatestReportsPerComponent();

    expect(supabase.state.queries[0].source).toBe(
      'latest_report_per_component'
    );
    expect(latest.map((r) => [r.id, r.componentId])).toEqual([
      ['a', 'I-1'],
      ['b', 'I-2'],
    ]);
  });

  it('drops a view row missing a column every report has', async () => {
    supabase.state.respond = () => ({
      data: [row('a'), row('b', { status: null })],
    });
    const latest = await fetchLatestReportsPerComponent();
    expect(latest.map((r) => r.id)).toEqual(['a']);
  });
});

describe('fetchReportList', () => {
  it('filters by component and date and caps the list in the database', async () => {
    supabase.state.respond = () => ({ data: [row('a')], count: 120 });
    const since = new Date('2026-09-01T00:00:00Z');

    const list = await fetchReportList({ componentId: 'I-1', since });

    expect(list.total).toBe(120);
    expect(list.reports.map((r) => r.id)).toEqual(['a']);
    const { source, calls } = supabase.state.queries[0];
    expect(source).toBe('reports');
    expect(calls).toEqual(
      expect.arrayContaining([
        ['neq', 'review_status', 'rejected'],
        ['eq', 'component_id', 'I-1'],
        ['gte', 'created_at', since.toISOString()],
        ['limit', 50],
      ])
    );
    // Never asks for the columns signed-out visitors can't read.
    const [, columns] = calls.find(([m]) => m === 'select')!;
    expect(columns).not.toMatch(/user_id|photo_lat|photo_lon|reviewed_by/);
  });

  it('sends no component or date filter when there is none', async () => {
    await fetchReportList();
    const { calls } = supabase.state.queries[0];
    expect(calls.some(([m]) => m === 'eq' || m === 'gte')).toBe(false);
  });

  it('throws on an error instead of returning an empty list', async () => {
    supabase.state.respond = () => ({ data: null, error: { message: 'x' } });
    await expect(fetchReportList()).rejects.toMatchObject({ message: 'x' });
  });
});

describe('fetchReportCountsByDay', () => {
  it('maps the per-day view to chart points', async () => {
    supabase.state.respond = () => ({
      data: [
        { day: '2026-09-01', report_count: 2 },
        { day: null, report_count: 9 },
      ],
    });
    await expect(fetchReportCountsByDay()).resolves.toEqual([
      { date: '2026-09-01', count: 2 },
    ]);
    expect(supabase.state.queries[0].source).toBe('report_counts_by_day');
  });
});

describe('uploadReport', () => {
  const photo = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });

  it('removes the uploaded photo when the report insert is refused', async () => {
    // A refused insert (rate limit, duplicate) must not leave the photo in
    // the public bucket burning the uploader's daily allowance.
    supabase.state.respond = (source) =>
      source === 'reports'
        ? { data: null, error: { message: 'Too many reports today.' } }
        : { data: [] };

    await expect(
      uploadReport(
        photo,
        'inlets',
        'Blocked',
        'I-1',
        123.9,
        10.3,
        'user-1',
        'Ana'
      )
    ).rejects.toMatchObject({ message: 'Too many reports today.' });

    const [upload, remove] = storage.calls;
    expect(upload).toMatchObject({ method: 'upload', bucket: 'ReportImage' });
    expect(remove).toMatchObject({
      method: 'remove',
      bucket: 'ReportImage',
      path: upload.path,
    });
  });

  it('keeps the photo when the report insert succeeds', async () => {
    await uploadReport(
      photo,
      'inlets',
      'Blocked',
      'I-1',
      123.9,
      10.3,
      'user-1',
      'Ana'
    );
    expect(storage.calls.map((c) => c.method)).toEqual(['upload']);
  });
});
