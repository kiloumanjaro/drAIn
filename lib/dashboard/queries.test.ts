import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A stand-in for the Supabase query builder. Every chained call is recorded,
 * and awaiting the chain asks `respond` for the result of that query.
 */
const supabase = vi.hoisted(() => {
  type Call = [method: string, ...args: unknown[]];
  type Result = { data: unknown; count?: number | null; error?: unknown };
  const state: { respond: (table: string, calls: Call[]) => Result } = {
    respond: () => ({ data: null }),
  };

  function from(table: string) {
    const calls: Call[] = [];
    const builder: Record<string, unknown> = {};
    for (const method of [
      'select',
      'eq',
      'gte',
      'not',
      'in',
      'limit',
      'order',
    ]) {
      builder[method] = (...args: unknown[]) => {
        calls.push([method, ...args]);
        return builder;
      };
    }
    builder.then = (
      resolve: (value: Result) => unknown,
      reject: (reason: unknown) => unknown
    ) => Promise.resolve(state.respond(table, calls)).then(resolve, reject);
    return builder;
  }

  return { state, from };
});

vi.mock('@/lib/supabase/client', () => ({
  default: { from: supabase.from },
}));

import {
  getOverviewMetrics,
  getRepairTimeByComponent,
  getRepairTrendData,
  getTeamPerformance,
} from './queries';

type Call = [string, ...unknown[]];
type Rows = Array<Record<string, unknown>>;

const isHeadCount = (calls: Call[]) =>
  calls.some(
    ([method, , options]) =>
      method === 'select' && (options as { head?: boolean })?.head === true
  );

const hasFilter = (calls: Call[], method: string, ...args: unknown[]) =>
  calls.some(
    ([m, ...rest]) =>
      m === method && args.every((arg, index) => rest[index] === arg)
  );

/** Answer the reports query with `reports` and the rest from `tables`. */
function respondWith(reports: Rows, tables: Record<string, Rows> = {}) {
  supabase.state.respond = (table, calls) => {
    if (isHeadCount(calls)) return { data: null, count: 0 };
    if (table === 'reports') return { data: reports };
    return { data: tables[table] ?? [] };
  };
}

beforeEach(() => {
  supabase.state.respond = () => ({ data: [] });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('getOverviewMetrics', () => {
  it('reads the head-only count queries from their count', async () => {
    // A head: true query returns no rows at all, only a count. These used
    // to read data?.length, so all three cards always said 0.
    supabase.state.respond = (table, calls) => {
      if (isHeadCount(calls)) {
        if (table === 'profiles') return { data: null, count: 4 };
        if (hasFilter(calls, 'eq', 'status', 'pending')) {
          return { data: null, count: 12 };
        }
        return { data: null, count: 7 };
      }
      return { data: [] };
    };

    const metrics = await getOverviewMetrics();

    expect(metrics).toMatchObject({
      fixedThisMonth: 7,
      pendingIssues: 12,
      totalAdmins: 4,
    });
  });

  it('averages repair time over the rows it can measure', async () => {
    respondWith(
      [
        { component_id: 'I-1', created_at: '2026-01-01T00:00:00Z' },
        { component_id: 'I-2', created_at: '2026-01-01T00:00:00Z' },
        { component_id: 'I-3', created_at: 'garbage' },
      ],
      {
        maintenance: [
          { component_name: 'I-1', performed_at: '2026-01-03T00:00:00Z' },
          { component_name: 'I-2', performed_at: '2026-01-05T00:00:00Z' },
          { component_name: 'I-3', performed_at: '2026-01-05T00:00:00Z' },
        ],
      }
    );

    const metrics = await getOverviewMetrics();

    // (2 + 4) / 2; the unparseable row is left out rather than poisoning it.
    expect(metrics.averageRepairDays).toBe(3);
  });
});

describe('getRepairTrendData', () => {
  it('keeps the chart when one report has a malformed date', async () => {
    // new Date('garbage').toISOString() throws. The whole query used to
    // fall into its catch and return nothing, emptying the chart.
    respondWith(
      [
        { component_id: 'I-1', created_at: '2026-01-01T00:00:00Z' },
        { component_id: 'I-2', created_at: 'garbage' },
      ],
      {
        maintenance: [
          { component_name: 'I-1', performed_at: '2026-01-03T00:00:00Z' },
          { component_name: 'I-2', performed_at: '2026-01-03T00:00:00Z' },
        ],
      }
    );

    await expect(getRepairTrendData()).resolves.toEqual([
      { date: '2026-01-01', averageDays: 2 },
    ]);
  });

  it('averages the repairs per report day, oldest first', async () => {
    respondWith(
      [
        { component_id: 'I-3', created_at: '2026-01-02T00:00:00Z' },
        { component_id: 'I-1', created_at: '2026-01-01T00:00:00Z' },
        { component_id: 'I-2', created_at: '2026-01-01T00:00:00Z' },
      ],
      {
        maintenance: [
          { component_name: 'I-1', performed_at: '2026-01-02T00:00:00Z' },
          { component_name: 'I-2', performed_at: '2026-01-04T00:00:00Z' },
          { component_name: 'I-3', performed_at: '2026-01-03T00:00:00Z' },
        ],
      }
    );

    await expect(getRepairTrendData()).resolves.toEqual([
      { date: '2026-01-01', averageDays: 2 },
      { date: '2026-01-02', averageDays: 1 },
    ]);
  });
});

describe('last cleaned lookup', () => {
  it('reads maintenance oldest first, so the latest record wins', async () => {
    // "Last cleaned" is the final value left in a map. The four old tables
    // were read in no order, so it was whichever row arrived last.
    let maintenanceCalls: Call[] = [];
    supabase.state.respond = (table, calls) => {
      if (table === 'maintenance') maintenanceCalls = calls;
      // One report, or the trend returns before it reads maintenance.
      if (table === 'reports') {
        return {
          data: [{ component_id: 'I-1', created_at: '2026-01-01T00:00:00Z' }],
        };
      }
      return { data: [] };
    };

    await getRepairTrendData();

    expect(hasFilter(maintenanceCalls, 'order', 'performed_at')).toBe(true);
    const order = maintenanceCalls.find(([method]) => method === 'order');
    expect(order?.[2]).toEqual({ ascending: true });
  });
});

describe('getRepairTimeByComponent', () => {
  it('averages per component type, skipping unusable rows', async () => {
    respondWith(
      [
        {
          category: 'inlets',
          component_id: 'I-1',
          created_at: '2026-01-01T00:00:00Z',
        },
        { category: 'inlets', component_id: 'I-2', created_at: 'garbage' },
        {
          category: 'man_pipes',
          component_id: 'P-1',
          created_at: '2026-01-05T00:00:00Z',
        },
      ],
      {
        maintenance: [
          { component_name: 'I-1', performed_at: '2026-01-04T00:00:00Z' },
          { component_name: 'I-2', performed_at: '2026-01-04T00:00:00Z' },
          // Cleaned before it was reported: a wrong link, not a fast fix.
          { component_name: 'P-1', performed_at: '2026-01-01T00:00:00Z' },
        ],
      }
    );

    await expect(getRepairTimeByComponent()).resolves.toEqual([
      { type: 'inlets', averageDays: 3, resolvedCount: 1 },
    ]);
  });
});

describe('getTeamPerformance', () => {
  const AGENCIES = {
    agencies: [
      { id: 'a', name: 'Alpha' },
      { id: 'b', name: 'Bravo' },
      { id: 'c', name: 'Charlie' },
    ],
    profiles: [
      { id: 'u1', agency_id: 'a' },
      { id: 'u2', agency_id: 'b' },
      { id: 'u3', agency_id: 'c' },
    ],
  };

  let nextId = 0;
  const report = (
    user_id: string,
    status: string,
    extra: Record<string, unknown> = {}
  ) => ({ id: `r${nextId++}`, user_id, status, ...extra });

  it('counts what is still open as total minus resolved', async () => {
    respondWith(
      [
        report('u1', 'resolved'),
        report('u1', 'pending'),
        report('u1', 'in-progress'),
      ],
      AGENCIES
    );

    const [alpha] = await getTeamPerformance();

    expect(alpha).toMatchObject({
      agencyName: 'Alpha',
      totalIssues: 3,
      resolvedIssues: 1,
      outstandingIssues: 2,
    });
  });

  it('orders agencies by what is still open, and drops idle ones', async () => {
    respondWith(
      [
        // Alpha has the most reports, but all resolved.
        report('u1', 'resolved'),
        report('u1', 'resolved'),
        report('u1', 'resolved'),
        // Bravo has two still open.
        report('u2', 'pending'),
        report('u2', 'pending'),
      ],
      AGENCIES
    );

    const rows = await getTeamPerformance();

    expect(rows.map((row) => row.agencyName)).toEqual(['Bravo', 'Alpha']);
  });

  it('measures time to resolve from the maintenance that closed it', async () => {
    respondWith(
      [
        report('u1', 'resolved', {
          created_at: '2026-01-01T00:00:00Z',
          resolved_by_maintenance_id: 'm1',
        }),
      ],
      {
        ...AGENCIES,
        maintenance: [{ id: 'm1', performed_at: '2026-01-03T00:00:00Z' }],
      }
    );

    const [alpha] = await getTeamPerformance();

    expect(alpha.medianDaysToResolve).toBe(2);
  });
});
