import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The dashboard's arithmetic lives in the database (schema_dashboard.sql,
 * tested in supabase/tests/database/07_dashboard.test.sql). These tests cover
 * what is left here: which view or function is read, how fields are renamed,
 * ordering, and falling back to empty values on an error.
 *
 * A stand-in for the Supabase client. Every chained call is recorded, and
 * awaiting a chain asks `respond` for the result of that query.
 */
const supabase = vi.hoisted(() => {
  type Call = [method: string, ...args: unknown[]];
  type Result = { data: unknown; error?: unknown; count?: number };
  const state: {
    respond: (source: string, calls: Call[]) => Result;
    rpcCalls: Array<[string, unknown]>;
    queries: Array<{ source: string; calls: Call[] }>;
  } = { respond: () => ({ data: [] }), rpcCalls: [], queries: [] };

  function chain(source: string, calls: Call[]) {
    const builder: Record<string, unknown> = {};
    state.queries.push({ source, calls });
    for (const method of [
      'select',
      'eq',
      'neq',
      'gte',
      'order',
      'range',
      'limit',
      'not',
      'in',
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

  return {
    state,
    from: (table: string) => chain(table, []),
    rpc: (fn: string, args: unknown) => {
      state.rpcCalls.push([fn, args]);
      return chain(`rpc:${fn}`, []);
    },
  };
});

vi.mock('@/lib/supabase/client', () => ({
  default: {
    from: supabase.from,
    rpc: supabase.rpc,
    storage: {
      from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }) }),
    },
  },
}));

import {
  getIssuesPerZone,
  getOverviewMetrics,
  getRepairTimeByComponent,
  getReportLocations,
  getReportsPage,
  getRepairTrendData,
  getTeamPerformance,
} from './queries';

const answer = (sources: Record<string, unknown>) => {
  supabase.state.respond = (source) =>
    source in sources ? { data: sources[source] } : { data: [] };
};

beforeEach(() => {
  supabase.state.respond = () => ({ data: [] });
  supabase.state.rpcCalls = [];
  supabase.state.queries = [];
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('getOverviewMetrics', () => {
  it('reads the overview function and renames its fields', async () => {
    answer({
      'rpc:dashboard_overview': [
        {
          fixed_this_month: 7,
          pending_issues: 12,
          average_repair_days: 3.5,
          total_staff: 4,
        },
      ],
    });

    await expect(getOverviewMetrics()).resolves.toEqual({
      fixedThisMonth: 7,
      pendingIssues: 12,
      averageRepairDays: 3.5,
      totalAdmins: 4,
    });
  });

  it("counts 'this month' from the viewer's local first of the month", async () => {
    await getOverviewMetrics();

    const [, args] = supabase.state.rpcCalls[0];
    const start = new Date((args as { p_month_start: string }).p_month_start);
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
  });

  it('fails on an error rather than showing zeros as if they were real', async () => {
    supabase.state.respond = () => ({ data: null, error: { message: 'x' } });

    await expect(getOverviewMetrics()).rejects.toMatchObject({ message: 'x' });
  });

  it('reads an empty answer as zeros', async () => {
    supabase.state.respond = () => ({ data: [] });

    await expect(getOverviewMetrics()).resolves.toMatchObject({
      fixedThisMonth: 0,
      totalAdmins: 0,
    });
  });
});

describe('getRepairTrendData', () => {
  it('maps each day to the chart shape', async () => {
    answer({
      'rpc:repair_trend': [
        { day: '2026-01-01', average_days: 2 },
        { day: '2026-01-02', average_days: 1 },
      ],
    });

    await expect(getRepairTrendData()).resolves.toEqual([
      { date: '2026-01-01', averageDays: 2 },
      { date: '2026-01-02', averageDays: 1 },
    ]);
  });
});

describe('getIssuesPerZone', () => {
  it('keeps the database order and skips rows without a zone', async () => {
    answer({
      report_counts_by_zone: [
        { zone: 'Tipolo', report_count: 5 },
        { zone: null, report_count: 9 },
        { zone: 'Banilad', report_count: 2 },
      ],
    });

    await expect(getIssuesPerZone()).resolves.toEqual([
      { zone: 'Tipolo', count: 5 },
      { zone: 'Banilad', count: 2 },
    ]);
  });
});

describe('getRepairTimeByComponent', () => {
  it('maps each component type', async () => {
    answer({
      repair_time_by_component: [
        { component_type: 'inlets', average_days: 3, resolved_count: 1 },
      ],
    });

    await expect(getRepairTimeByComponent()).resolves.toEqual([
      { type: 'inlets', averageDays: 3, resolvedCount: 1 },
    ]);
  });
});

describe('getTeamPerformance', () => {
  const row = (
    agency_name: string,
    total_issues: number,
    outstanding_issues: number,
    median_days_to_resolve: number | null = null
  ) => ({
    agency_name,
    total_issues,
    resolved_issues: total_issues - outstanding_issues,
    outstanding_issues,
    median_days_to_resolve,
  });

  it('orders agencies by what is still open, and drops idle ones', async () => {
    answer({
      team_performance: [
        // Alpha has the most reports, but all resolved.
        row('Alpha', 3, 0, 1),
        row('Bravo', 2, 2),
        row('Charlie', 0, 0),
      ],
    });

    const rows = await getTeamPerformance();

    expect(rows.map((r) => r.agencyName)).toEqual(['Bravo', 'Alpha']);
  });

  it('keeps "no figure" as null rather than zero', async () => {
    answer({ team_performance: [row('Bravo', 2, 2)] });

    const [bravo] = await getTeamPerformance();

    expect(bravo).toMatchObject({
      totalIssues: 2,
      resolvedIssues: 0,
      outstandingIssues: 2,
      medianDaysToResolve: null,
    });
  });
});

describe('getReportsPage', () => {
  const row = {
    id: 'r1',
    created_at: '2026-09-01T00:00:00Z',
    status: 'pending',
    priority: 'high',
    category: 'inlets',
    zone: 'Tipolo',
    long: 123.9,
    lat: 10.3,
  };
  // The head-only request is the unfiltered total; the other is the page.
  const isHead = (calls: unknown[][]) =>
    calls.some(
      ([m, , opts]) => m === 'select' && (opts as { head?: boolean })?.head
    );

  it('filters, limits and counts in the database', async () => {
    supabase.state.respond = (_source, calls) =>
      isHead(calls) ? { data: null, count: 40 } : { data: [row], count: 3 };

    const page = await getReportsPage(
      {
        priority: 'high',
        status: 'all',
        componentType: 'inlets',
        includeRejected: false,
      },
      24
    );

    expect(page).toMatchObject({ matching: 3, total: 40 });
    expect(page.reports).toHaveLength(1);
    expect(page.reports[0]).toMatchObject({ id: 'r1', zone: 'Tipolo' });

    const [pageQuery, totalQuery] = supabase.state.queries;
    expect(pageQuery.calls).toEqual(
      expect.arrayContaining([
        ['eq', 'priority', 'high'],
        ['eq', 'category', 'inlets'],
        ['neq', 'review_status', 'rejected'],
        ['limit', 24],
      ])
    );
    expect(
      pageQuery.calls.some(([m, col]) => m === 'eq' && col === 'status')
    ).toBe(false);
    expect(totalQuery.calls).toContainEqual([
      'neq',
      'review_status',
      'rejected',
    ]);
  });

  it('includes rejected reports only when asked', async () => {
    await getReportsPage(
      {
        priority: 'all',
        status: 'all',
        componentType: 'all',
        includeRejected: true,
      },
      24
    );
    for (const query of supabase.state.queries) {
      expect(query.calls.some(([m]) => m === 'neq')).toBe(false);
    }
  });

  it('ignores filter values that are not in the vocabulary', async () => {
    await getReportsPage(
      {
        priority: 'urgent',
        status: 'done',
        componentType: 'x',
        includeRejected: false,
      },
      24
    );
    expect(supabase.state.queries[0].calls.some(([m]) => m === 'eq')).toBe(
      false
    );
  });

  it('fails loudly instead of showing an empty list', async () => {
    supabase.state.respond = () => ({ data: null, error: { message: 'x' } });
    await expect(
      getReportsPage(
        {
          priority: 'all',
          status: 'all',
          componentType: 'all',
          includeRejected: false,
        },
        24
      )
    ).rejects.toMatchObject({ message: 'x' });
  });
});

describe('getReportLocations', () => {
  it('returns positions only, skipping reports without one', async () => {
    answer({
      reports: [
        { id: 'a', long: 123.9, lat: 10.3, zone: 'Tipolo' },
        { id: 'b', long: null, lat: null, zone: null },
      ],
    });
    await expect(getReportLocations()).resolves.toEqual([
      { coordinates: [123.9, 10.3], zone: 'Tipolo' },
    ]);
    expect(supabase.state.queries[0].calls).toContainEqual([
      'select',
      'id, long, lat, zone',
    ]);
  });
});
