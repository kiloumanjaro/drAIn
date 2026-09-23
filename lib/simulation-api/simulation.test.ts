import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runSimulation, transformToNodeDetails } from './simulation';
import type { NodeSimulationResult } from './simulation';

function result(
  overrides: Partial<NodeSimulationResult> = {}
): NodeSimulationResult {
  return {
    Node: 'I-1',
    Hours_Flooded: 2,
    Maximum_Rate_CMS: 0.5,
    Time_of_Max_days: 0,
    Time_of_Max_hr_min: 20,
    Total_Flood_Volume_10e6_ltr: 42,
    Time_After_Raining_min: 120,
    Vulnerability_Category: 'Medium',
    Vulnerability_Score: 0.6,
    ...overrides,
  };
}

describe('transformToNodeDetails', () => {
  it('maps the backend field names onto the table shape', () => {
    const [row] = transformToNodeDetails([result()]);
    expect(row).toMatchObject({
      Node_ID: 'I-1',
      Vulnerability_Category: 'Medium',
      Hours_Flooded: 2,
      Maximum_Rate: 0.5,
      Time_Of_Max_Occurence: 20,
      Total_Flood_Volume: 42,
      Time_Before_Overflow: 120,
    });
  });

  it.each([
    [5, 4],
    [4.1, 4],
    [2, 3],
    [1.1, 3],
    [0.5, 2],
    [0, 1],
    [-1, 1],
  ])('ranks a score of %s as %s', (score, rank) => {
    const [row] = transformToNodeDetails([
      result({ Vulnerability_Score: score }),
    ]);
    expect(row.Vulnerability_Rank).toBe(rank);
  });

  it.each([
    [1, 10],
    [0.5, 10],
    [2, 25],
    [3, 50],
    [24, 50],
  ])('approximates a %s-hour storm as a %s-year return period', (hours, yr) => {
    const [row] = transformToNodeDetails([result()], hours);
    expect(row.YR).toBe(yr);
  });

  it('defaults to a one-hour storm', () => {
    expect(transformToNodeDetails([result()])[0].YR).toBe(10);
  });

  it('returns nothing for an empty response', () => {
    expect(transformToNodeDetails([])).toEqual([]);
  });
});

describe('runSimulation', () => {
  const NODES = {};
  const LINKS = {};
  const RAINFALL = { total_precip: 400, duration_hr: 24 };

  function jsonResponse(
    body: unknown,
    init: { status?: number; headers?: Record<string, string> } = {}
  ): Response {
    return new Response(JSON.stringify(body), {
      status: init.status ?? 200,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
  }

  const accepted = (headers: Record<string, string> = {}) =>
    jsonResponse(
      { job_id: 'abc', status: 'queued', poll_url: '/simulations/abc' },
      { status: 202, headers }
    );

  const state = (
    status: string,
    extra: Record<string, unknown> = {}
  ): Response =>
    jsonResponse({
      job_id: 'abc',
      status,
      result: null,
      error: null,
      ...extra,
    });

  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  /** Drives the polling loop past its waits. */
  async function runToCompletion<T>(promise: Promise<T>): Promise<T> {
    const settled = promise.then(
      (value) => ({ ok: true as const, value }),
      (error) => ({ ok: false as const, error })
    );
    for (let i = 0; i < 50; i++) {
      await vi.advanceTimersByTimeAsync(3000);
    }
    const outcome = await settled;
    if (!outcome.ok) throw outcome.error;
    return outcome.value;
  }

  it('starts the job and returns the polled result', async () => {
    const result = { nodes_list: [{ Node: 'I-4' }] };
    fetchMock
      .mockResolvedValueOnce(accepted())
      .mockResolvedValueOnce(state('running'))
      .mockResolvedValueOnce(state('succeeded', { result }));

    await expect(
      runToCompletion(runSimulation(NODES, LINKS, RAINFALL))
    ).resolves.toEqual(result);
  });

  it('posts the payload to the queueing endpoint', async () => {
    fetchMock
      .mockResolvedValueOnce(accepted())
      .mockResolvedValueOnce(
        state('succeeded', { result: { nodes_list: [] } })
      );

    await runToCompletion(runSimulation(NODES, LINKS, RAINFALL));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/simulations$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      nodes: NODES,
      links: LINKS,
      rainfall: RAINFALL,
    });
  });

  it('reports each status transition', async () => {
    fetchMock
      .mockResolvedValueOnce(accepted())
      .mockResolvedValueOnce(state('running'))
      .mockResolvedValueOnce(state('running'))
      .mockResolvedValueOnce(
        state('succeeded', { result: { nodes_list: [] } })
      );

    const seen: string[] = [];
    await runToCompletion(
      runSimulation(NODES, LINKS, RAINFALL, (s) => seen.push(s))
    );
    // 'running' is reported once, not on every poll.
    expect(seen).toEqual(['queued', 'running', 'succeeded']);
  });

  it('explains a busy queue rather than reporting a failure', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ detail: 'too many' }, { status: 429 })
    );
    await expect(
      runToCompletion(runSimulation(NODES, LINKS, RAINFALL))
    ).rejects.toThrow(/busy/i);
  });

  it('surfaces the reason a run failed', async () => {
    fetchMock
      .mockResolvedValueOnce(accepted())
      .mockResolvedValueOnce(state('failed', { error: 'SWMM exploded' }));

    await expect(
      runToCompletion(runSimulation(NODES, LINKS, RAINFALL))
    ).rejects.toThrow('SWMM exploded');
  });

  it('explains an expired result', async () => {
    fetchMock
      .mockResolvedValueOnce(accepted())
      .mockResolvedValueOnce(jsonResponse({ detail: 'gone' }, { status: 404 }));

    await expect(
      runToCompletion(runSimulation(NODES, LINKS, RAINFALL))
    ).rejects.toThrow(/expired/i);
  });

  it('rejects when the job cannot be started', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ detail: 'nope' }, { status: 500 })
    );
    await expect(
      runToCompletion(runSimulation(NODES, LINKS, RAINFALL))
    ).rejects.toThrow(/could not start/i);
  });

  it('rejects a success that carries no result', async () => {
    fetchMock
      .mockResolvedValueOnce(accepted())
      .mockResolvedValueOnce(state('succeeded'));

    await expect(
      runToCompletion(runSimulation(NODES, LINKS, RAINFALL))
    ).rejects.toThrow(/returned nothing/i);
  });

  it('waits as long as the server asks between polls', async () => {
    fetchMock
      .mockResolvedValueOnce(accepted({ 'Retry-After': '30' }))
      .mockResolvedValueOnce(
        state('succeeded', { result: { nodes_list: [] } })
      );

    const promise = runSimulation(NODES, LINKS, RAINFALL);
    const settled = promise.then(() => 'done');

    await vi.advanceTimersByTimeAsync(10_000);
    // Still waiting out the 30s the server asked for.
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(25_000);
    await expect(settled).resolves.toBe('done');
  });
});
