import { describe, expect, it } from 'vitest';
import { CLOCK_SKEW_SECONDS, MAX_TOKEN_CHARS, looksLikeLiveJwt } from './token';

const NOW_MS = 1_800_000_000_000;
const NOW_S = NOW_MS / 1000;

const encode = (value: unknown) =>
  Buffer.from(typeof value === 'string' ? value : JSON.stringify(value))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

/** An unsigned token: the signature is never looked at here. */
const token = (payload: unknown, header: unknown = { alg: 'ES256' }) =>
  `${encode(header)}.${encode(payload)}.c2lnbmF0dXJl`;

describe('looksLikeLiveJwt', () => {
  it('passes a token that has not expired', () => {
    expect(
      looksLikeLiveJwt(token({ sub: 'u', exp: NOW_S + 3600 }), NOW_MS)
    ).toBe(true);
  });

  it('passes a payload with non-ASCII text and url-safe characters', () => {
    // "ÿ?>" style content forces '-' and '_' into the encoding.
    const candidate = token({
      name: 'Señor Niño ÿÿÿ???>>>',
      exp: NOW_S + 60,
    });
    expect(candidate).toMatch(/[-_]/);
    expect(looksLikeLiveJwt(candidate, NOW_MS)).toBe(true);
  });

  it('allows a little clock skew, and no more', () => {
    expect(
      looksLikeLiveJwt(token({ exp: NOW_S - CLOCK_SKEW_SECONDS }), NOW_MS)
    ).toBe(true);
    expect(
      looksLikeLiveJwt(token({ exp: NOW_S - CLOCK_SKEW_SECONDS - 1 }), NOW_MS)
    ).toBe(false);
  });

  it('refuses an expired token', () => {
    expect(looksLikeLiveJwt(token({ exp: NOW_S - 3600 }), NOW_MS)).toBe(false);
  });

  it('refuses a token with no usable expiry', () => {
    for (const exp of [undefined, null, '9999999999', Infinity, {}]) {
      expect(looksLikeLiveJwt(token({ sub: 'u', exp }), NOW_MS)).toBe(false);
    }
  });

  it('refuses text that is not three base64url parts', () => {
    const good = token({ exp: NOW_S + 60 });
    for (const candidate of [
      '',
      'garbage',
      'a.b',
      `${good}.extra`,
      good.replace('.', '..'),
      `${good}=`,
      good.replace('.', ' .'),
      `Bearer ${good}`,
      '..',
    ]) {
      expect(looksLikeLiveJwt(candidate, NOW_MS), candidate).toBe(false);
    }
  });

  it('refuses parts that do not hold JSON objects', () => {
    const payload = { exp: NOW_S + 60 };
    expect(looksLikeLiveJwt(token(payload, 'not json'), NOW_MS)).toBe(false);
    expect(looksLikeLiveJwt(token(payload, [1]), NOW_MS)).toBe(false);
    expect(looksLikeLiveJwt(token('not json'), NOW_MS)).toBe(false);
    expect(looksLikeLiveJwt(token([payload]), NOW_MS)).toBe(false);
    expect(looksLikeLiveJwt(token(null), NOW_MS)).toBe(false);
    expect(looksLikeLiveJwt('aaaa.aaaa.aaaa', NOW_MS)).toBe(false);
  });

  it('refuses an oversized token without decoding it', () => {
    const huge = token({ exp: NOW_S + 60, pad: 'x'.repeat(MAX_TOKEN_CHARS) });
    expect(looksLikeLiveJwt(huge, NOW_MS)).toBe(false);
  });

  it('refuses anything that is not text', () => {
    expect(looksLikeLiveJwt(undefined as unknown as string, NOW_MS)).toBe(
      false
    );
  });

  it('uses the current time by default', () => {
    expect(looksLikeLiveJwt(token({ exp: Date.now() / 1000 + 3600 }))).toBe(
      true
    );
    expect(looksLikeLiveJwt(token({ exp: Date.now() / 1000 - 3600 }))).toBe(
      false
    );
  });
});
