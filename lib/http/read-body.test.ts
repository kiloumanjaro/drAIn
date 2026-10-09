import { describe, expect, it } from 'vitest';
import { readTextCapped } from './read-body';

function post(body: BodyInit | null, headers: Record<string, string> = {}) {
  return new Request('http://app.test/api', {
    method: 'POST',
    body,
    headers,
    // Node needs this to send a stream as a body.
    ...(body instanceof ReadableStream ? { duplex: 'half' } : {}),
  } as RequestInit);
}

/** A body sent in pieces, counting how many were asked for. */
function chunked(pieces: string[]) {
  const state = { pulled: 0, cancelled: false };
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (state.pulled === pieces.length) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(pieces[state.pulled]));
        state.pulled += 1;
      },
      cancel() {
        state.cancelled = true;
      },
    },
    // Nothing is read ahead, so `pulled` counts what the reader took.
    { highWaterMark: 0 }
  );
  return { stream, state };
}

describe('readTextCapped', () => {
  it('returns a body within the limit', async () => {
    expect(await readTextCapped(post('{"a":1}'), 100)).toBe('{"a":1}');
  });

  it('returns an empty string when there is no body', async () => {
    expect(await readTextCapped(post(null), 100)).toBe('');
  });

  it('accepts a body of exactly the limit', async () => {
    expect(await readTextCapped(post('x'.repeat(100)), 100)).toHaveLength(100);
  });

  it('refuses a declared length over the limit without reading', async () => {
    const { stream, state } = chunked(['small']);
    const request = post(stream, { 'content-length': '5000' });

    expect(await readTextCapped(request, 100)).toBeNull();
    expect(state.pulled).toBe(0);
  });

  it('stops part-way through a body that gave no length', async () => {
    const { stream, state } = chunked(Array(50).fill('x'.repeat(40)));

    expect(await readTextCapped(post(stream), 100)).toBeNull();
    expect(state.pulled).toBe(3);
    expect(state.cancelled).toBe(true);
  });

  it('counts bytes, not characters', async () => {
    // 40 characters, 120 bytes in UTF-8.
    expect(await readTextCapped(post('€'.repeat(40)), 100)).toBeNull();
  });

  it('keeps a character split across two pieces whole', async () => {
    const bytes = new TextEncoder().encode('a€b');
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 2));
        controller.enqueue(bytes.slice(2));
        controller.close();
      },
    });

    expect(await readTextCapped(post(stream), 100)).toBe('a€b');
  });
});
