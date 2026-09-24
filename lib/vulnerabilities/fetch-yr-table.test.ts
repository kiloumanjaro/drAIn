import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabase = vi.hoisted(() => {
  const result: { data: unknown; error: unknown } = { data: null, error: null };
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve),
  };
  return { result, query, from: vi.fn(() => query) };
});

vi.mock('@/lib/supabase/client', () => ({
  default: { from: supabase.from },
}));

import { fetchNodeDeets, fetchYRTable } from './fetch-yr-table';

/** A row as the stored per-return-period tables hold it. */
function storedRow(overrides: Record<string, unknown> = {}) {
  return {
    Node_ID: 'I-7',
    Vulnerability_Category: 'High Risk',
    Vulnerability_Rank: 4,
    Cluster: 2,
    Cluster_Score: 0.8,
    YR: 25,
    Time_After_Raining_min: 45,
    'Hours Flooded': 1.5,
    'Maximum Rate (CMS)': 0.3,
    'Time of Max (hr:min)': 2.25,
    'Total Flood Volume (10^6 ltr)': 9,
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
  it('maps the stored column names onto the table shape', async () => {
    supabase.result.data = [storedRow()];

    const [row] = await fetchYRTable(25);

    expect(supabase.from).toHaveBeenCalledWith('25YR');
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
      Time_Of_Max_Occurence: 2.25,
      Total_Flood_Volume: 9,
    });
  });

  it('turns the 9999 never-overflowed sentinel into null', async () => {
    // Only the live-simulation mapper used to translate it, so the stored
    // scenarios showed "9,999" minutes and ranked it in the charts.
    supabase.result.data = [storedRow({ Time_After_Raining_min: 9999 })];

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

describe('fetchNodeDeets', () => {
  it('looks the node up in the right table and maps it', async () => {
    supabase.result.data = storedRow();

    const row = await fetchNodeDeets('I-7', 25);

    expect(supabase.from).toHaveBeenCalledWith('25YR');
    expect(supabase.query.eq).toHaveBeenCalledWith('Node_ID', 'I-7');
    expect(row).toMatchObject({ Node_ID: 'I-7', Time_Before_Overflow: 45 });
  });

  it('turns the 9999 never-overflowed sentinel into null', async () => {
    supabase.result.data = storedRow({ Time_After_Raining_min: 9999 });

    const row = await fetchNodeDeets('I-7', 25);

    expect(row?.Time_Before_Overflow).toBeNull();
  });

  it('returns null when the query fails', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    supabase.result.error = { message: 'no rows' };

    await expect(fetchNodeDeets('I-404', 25)).resolves.toBeNull();
    error.mockRestore();
  });
});
