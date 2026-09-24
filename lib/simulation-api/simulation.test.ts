import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildSimulationRequest,
  runSimulation,
  transformToNodeDetails,
} from './simulation';
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
    Barangay: 'Mantuyong',
    Population_Density: 40480,
    Exposure_Score: 1,
    Risk_Score: 0.6,
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
    ['High', 4],
    ['Medium', 3],
    ['Low', 2],
    ['No hazard', 1],
  ])('ranks a %s node as %s', (category, rank) => {
    const [row] = transformToNodeDetails([
      result({ Vulnerability_Category: category }),
    ]);
    expect(row.Vulnerability_Rank).toBe(rank);
  });

  it('ranks by category, not by the raw score', () => {
    // The rank used to be thresholded off the score at 4/1/0 — values the
    // hazard score no longer takes, so everything would come back rank 1-2.
    const [row] = transformToNodeDetails([
      result({ Vulnerability_Category: 'High', Vulnerability_Score: 0.9 }),
    ]);
    expect(row.Vulnerability_Rank).toBe(4);
  });

  it.each([
    ['High Risk', 4],
    ['Medium Risk', 3],
    ['Low Risk', 2],
    ['No Risk', 1],
    ['  HIGH ', 4],
    ['medium', 3],
    ['low	', 2],
  ])('ranks %j the same as the live label', (category, rank) => {
    const [row] = transformToNodeDetails([
      result({ Vulnerability_Category: category }),
    ]);
    expect(row.Vulnerability_Rank).toBe(rank);
  });

  it('tolerates an unrecognised category', () => {
    const [row] = transformToNodeDetails([
      result({ Vulnerability_Category: 'N/A' }),
    ]);
    expect(row.Vulnerability_Rank).toBe(1);
  });

  it('carries exposure and risk through when the backend supplies them', () => {
    const [row] = transformToNodeDetails([
      result({
        Barangay: 'Mantuyong',
        Population_Density: 40480,
        Exposure_Score: 1,
        Risk_Score: 0.9,
      }),
    ]);
    expect(row).toMatchObject({
      Barangay: 'Mantuyong',
      Population_Density: 40480,
      Exposure_Score: 1,
      Risk_Score: 0.9,
    });
  });

  it('leaves exposure null for results that predate it', () => {
    // Defensive: the backend always sends these now.
    const {
      Barangay: _b,
      Population_Density: _p,
      Exposure_Score: _e,
      Risk_Score: _r,
      ...older
    } = result();
    const [row] = transformToNodeDetails([older as NodeSimulationResult]);
    expect(row.Risk_Score).toBeNull();
    expect(row.Barangay).toBeNull();
  });

  it('reports no return period for a custom storm', () => {
    // It used to guess one from the duration alone, so a 10 mm hour and a
    // 200 mm hour both came out "10YR" — and that guess was then used to
    // look up real historical data for that return period.
    expect(transformToNodeDetails([result()])[0].YR).toBeNull();
  });

  it('returns nothing for an empty response', () => {
    expect(transformToNodeDetails([])).toEqual([]);
  });
});

describe('buildSimulationRequest', () => {
  it('passes set values through, zeros included', () => {
    expect(
      buildSimulationRequest(
        { 'I-1': { inv_elev: 3.2, init_depth: 0 } },
        { 'C-1': { init_flow: 0.4 } },
        { total_precip: 120, duration_hr: 6 }
      )
    ).toEqual({
      nodes: { 'I-1': { inv_elev: 3.2, init_depth: 0 } },
      links: { 'C-1': { init_flow: 0.4 } },
      rainfall: { total_precip: 120, duration_hr: 6 },
    });
  });

  it('leaves out values that are not set rather than sending them', () => {
    // A missing invert elevation used to be filled in as 0 m, which the
    // model then took literally.
    const request = buildSimulationRequest(
      {
        'I-1': {
          inv_elev: undefined,
          init_depth: NaN,
          ponding_area: null as unknown as number,
          surcharge_depth: 1,
        },
      },
      {},
      { total_precip: 50, duration_hr: undefined }
    );
    expect(request.nodes).toEqual({ 'I-1': { surcharge_depth: 1 } });
    expect(request.rainfall).toEqual({ total_precip: 50 });
    expect(JSON.stringify(request)).not.toMatch(/null|NaN/);
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

  it('sends only the values that are set', async () => {
    fetchMock
      .mockResolvedValueOnce(accepted())
      .mockResolvedValueOnce(
        state('succeeded', { result: { nodes_list: [] } })
      );

    await runToCompletion(
      runSimulation({ 'I-1': { inv_elev: undefined, init_depth: 2 } }, LINKS, {
        total_precip: 400,
        duration_hr: NaN,
      })
    );

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      nodes: { 'I-1': { init_depth: 2 } },
      links: {},
      rainfall: { total_precip: 400 },
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
  it('keeps polling a job that sits in the queue for a quarter of an hour', async () => {
    // The backend queue can hold a job for 16-30 minutes. The client used
    // to give up after 10 and report a run that was still coming.
    const result = { nodes_list: [] };
    let polls = 0;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/simulations')) return accepted();
      polls += 1;
      const elapsedMin = (polls * 3) / 60;
      return elapsedMin < 20 ? state('queued') : state('succeeded', { result });
    });

    const promise = runSimulation(NODES, LINKS, RAINFALL);
    const settled = promise.then(
      (value) => ({ ok: true as const, value }),
      (error) => ({ ok: false as const, error })
    );
    await vi.advanceTimersByTimeAsync(21 * 60 * 1000);

    await expect(settled).resolves.toEqual({ ok: true, value: result });
  });

  it('gives up once the job has had half an hour', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/simulations') ? accepted() : state('running')
    );

    const promise = runSimulation(NODES, LINKS, RAINFALL);
    const settled = promise.then(
      () => 'resolved',
      (error: Error) => error.message
    );
    await vi.advanceTimersByTimeAsync(29 * 60 * 1000);
    await expect(
      Promise.race([settled, Promise.resolve('pending')])
    ).resolves.toBe('pending');

    await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
    await expect(settled).resolves.toMatch(/did not finish in time/i);
  });

  it('reports a failed poll other than an expired result', async () => {
    fetchMock
      .mockResolvedValueOnce(accepted())
      .mockResolvedValueOnce(jsonResponse({ detail: 'oops' }, { status: 502 }));

    await expect(
      runToCompletion(runSimulation(NODES, LINKS, RAINFALL))
    ).rejects.toThrow(/progress \(HTTP 502\)/);
  });

  it('gives a generic reason when a failed run carries none', async () => {
    fetchMock
      .mockResolvedValueOnce(accepted())
      .mockResolvedValueOnce(state('failed', { error: null }));

    await expect(
      runToCompletion(runSimulation(NODES, LINKS, RAINFALL))
    ).rejects.toThrow('The simulation failed.');
  });

  it('rejects when the network request itself fails', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(
      runToCompletion(runSimulation(NODES, LINKS, RAINFALL))
    ).rejects.toThrow('Failed to fetch');
  });

  it('rejects when a poll cannot reach the server', async () => {
    fetchMock
      .mockResolvedValueOnce(accepted())
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(
      runToCompletion(runSimulation(NODES, LINKS, RAINFALL))
    ).rejects.toThrow('Failed to fetch');
  });

  it.each([
    ['missing', undefined],
    ['zero', '0'],
    ['not a number', 'soon'],
    ['an HTTP date', 'Wed, 21 Oct 2026 07:28:00 GMT'],
  ])(
    'polls every 3 seconds when Retry-After is %s',
    async (_case, retryAfter) => {
      fetchMock
        .mockResolvedValueOnce(
          accepted(
            retryAfter === undefined ? {} : { 'Retry-After': retryAfter }
          )
        )
        .mockResolvedValueOnce(
          state('succeeded', { result: { nodes_list: [] } })
        );

      const settled = runSimulation(NODES, LINKS, RAINFALL).then(() => 'done');

      await vi.advanceTimersByTimeAsync(2_900);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(200);
      await expect(settled).resolves.toBe('done');
    }
  );
});

describe('the never-overflowed sentinel', () => {
  it('becomes null rather than a 9999 minute measurement', () => {
    // Stored scenarios predate the backend emitting null, so the client
    // still has to translate. Served as-is it renders as "9,999" in the
    // results table for three quarters of all nodes.
    const [row] = transformToNodeDetails([
      result({ Time_After_Raining_min: 9999 }),
    ]);
    expect(row.Time_Before_Overflow).toBeNull();
  });

  it('passes a real overflow time through untouched', () => {
    const [row] = transformToNodeDetails([
      result({ Time_After_Raining_min: 120 }),
    ]);
    expect(row.Time_Before_Overflow).toBe(120);
  });

  it('accepts null straight from the backend', () => {
    const [row] = transformToNodeDetails([
      result({ Time_After_Raining_min: null }),
    ]);
    expect(row.Time_Before_Overflow).toBeNull();
  });
});
