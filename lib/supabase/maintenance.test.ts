import { beforeEach, describe, expect, it, vi } from 'vitest';

// A stand-in client that records each rpc call and answers with `result`.
const supabase = vi.hoisted(() => {
  const state = {
    rpcCalls: [] as Array<[string, unknown]>,
    result: { data: null, error: null } as { data: unknown; error: unknown },
  };
  return {
    state,
    rpc: (fn: string, args: unknown) => {
      state.rpcCalls.push([fn, args]);
      return Promise.resolve(state.result);
    },
  };
});

vi.mock('@/lib/supabase/client', () => ({ default: { rpc: supabase.rpc } }));

import { recordMaintenance } from './maintenance';

beforeEach(() => {
  supabase.state.rpcCalls = [];
  supabase.state.result = { data: { id: 'm-1' }, error: null };
});

describe('recordMaintenance', () => {
  it('sends what the evidence photo said about where and when', async () => {
    await recordMaintenance(
      'inlets',
      'I-0',
      'resolved',
      'Cleared',
      'public/a.jpg',
      {
        latitude: 10.3,
        longitude: 123.9,
        date: new Date('2026-01-15T12:00:00Z'),
      }
    );

    expect(supabase.state.rpcCalls).toEqual([
      [
        'record_maintenance',
        {
          p_component_type: 'inlets',
          p_component_name: 'I-0',
          p_status: 'resolved',
          p_description: 'Cleared',
          p_evidence_image: 'public/a.jpg',
          p_evidence_lat: 10.3,
          p_evidence_lon: 123.9,
          p_evidence_taken_at: '2026-01-15T12:00:00.000Z',
        },
      ],
    ]);
  });

  it('leaves the evidence values out when the photo had none', async () => {
    await recordMaintenance(
      'inlets',
      'I-0',
      'resolved',
      'Cleared',
      'public/a.jpg',
      {
        latitude: null,
        longitude: null,
        date: null,
      }
    );
    await recordMaintenance('inlets', 'I-0', 'in-progress');

    for (const [, args] of supabase.state.rpcCalls) {
      const sent = args as Record<string, unknown>;
      expect(sent.p_evidence_lat).toBeUndefined();
      expect(sent.p_evidence_lon).toBeUndefined();
      expect(sent.p_evidence_taken_at).toBeUndefined();
    }
  });

  it('passes the database refusal on as the error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    supabase.state.result = {
      data: null,
      error: { message: 'Evidence must be from within 50 m of the component.' },
    };

    const result = await recordMaintenance('inlets', 'I-0', 'resolved');

    expect(result).toEqual({
      success: false,
      error: 'Evidence must be from within 50 m of the component.',
    });
  });
});
