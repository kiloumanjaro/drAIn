import { afterEach, describe, expect, it, vi } from 'vitest';
import { predict } from './predict';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const input = {
  point: [1.2, 0.6, 350, 0.004] as [number, number, number, number],
};

describe('predict', () => {
  it('posts the feature vector to the chosen return-period endpoint', async () => {
    vi.stubEnv('NEXT_PUBLIC_BACKEND_URL', 'https://backend.test');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ prediction: 0.8 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await predict('predict-100yr', input);

    expect(result).toEqual({ prediction: 0.8 });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://backend.test/predict-100yr',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }
    );
  });

  it('throws with the HTTP status when the backend rejects the request', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('NEXT_PUBLIC_BACKEND_URL', 'https://backend.test');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503 })
    );

    await expect(predict('predict-50yr', input)).rejects.toThrow(
      'API error: 503'
    );
  });

  it('propagates a network failure instead of hiding it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('NEXT_PUBLIC_BACKEND_URL', 'https://backend.test');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down'))
    );

    await expect(predict('predict-25yr', input)).rejects.toThrow(
      'network down'
    );
  });
});
