import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabase = vi.hoisted(() => {
  const result: { data: unknown; error: unknown } = { data: null, error: null };
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn(() => query),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve),
  };
  return { result, query, from: vi.fn(() => query) };
});

vi.mock('@/lib/supabase/client', () => ({
  default: { from: supabase.from },
}));

import { fetchYRTable } from './fetch-yr-table';

/** A row as public.flood_results holds it. */
function storedRow(overrides: Record<string, unknown> = {}) {
  return {
    return_period: 25,
    node_id: 'I-7',
    vulnerability_category: 'High Risk',
    vulnerability_rank: 4,
    cluster: 2,
    cluster_score: 0.8,
    time_after_raining_min: 45,
    hours_flooded: 1.5,
    max_rate_cms: 0.3,
    time_of_max: 2,
    total_flood_volume_megalitres: 9,
    ...overrides,
  };
}

beforeEach(() => {
  supabase.result.data = null;
  supabase.result.error = null;
  supabase.from.mockClear();
  supabase.query.eq.mockClear();
});

describe('fetchYRTable', () => {
  it('reads one return period and maps it onto the table shape', async () => {
    supabase.result.data = [storedRow()];

    const [row] = await fetchYRTable(25);

    expect(supabase.from).toHaveBeenCalledWith('flood_results');
    expect(supabase.query.eq).toHaveBeenCalledWith('return_period', 25);
    expect(row).toEqual({
      Node_ID: 'I-7',
      Vulnerability_Category: 'High Risk',
      Vulnerability_Rank: 4,
      Cluster: 2,
      Cluster_Score: 0.8,
      YR: 25,
      Time_Before_Overflow: 45,
      Hours_Flooded: 1.5,
      Maximum_Rate: 0.3,
      Time_Of_Max_Occurence: 2,
      Total_Flood_Volume: 9,
    });
  });

  it('turns the 9999 never-overflowed sentinel into null', async () => {
    // Only the live-simulation mapper used to translate it, so the stored
    // scenarios showed "9,999" minutes and ranked it in the charts.
    supabase.result.data = [storedRow({ time_after_raining_min: 9999 })];

    const [row] = await fetchYRTable(10);

    expect(row.Time_Before_Overflow).toBeNull();
  });

  it('rethrows a query error', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    supabase.result.error = { message: 'boom' };

    await expect(fetchYRTable(5)).rejects.toEqual({ message: 'boom' });
    error.mockRestore();
  });
});
