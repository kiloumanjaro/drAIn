import { describe, expect, it } from 'vitest';
import {
  MIN_SECRET_CHARS,
  readHistorySecret,
  signReply,
  verifyReply,
} from './history-signature';

const SECRET = 's'.repeat(MIN_SECRET_CHARS);
const USER = '6f1c2f0e-4a53-4a0e-9b0a-2d0a8f1c7e11';
const OTHER_USER = '0b7d9c55-1e0f-4a7e-8f4f-8f2f0f8f6a22';
const REPLY = 'An outlet is where the network discharges.';

describe('signReply and verifyReply', () => {
  it('verifies a reply it signed', () => {
    const sig = signReply(SECRET, USER, REPLY);
    expect(sig).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(verifyReply(SECRET, USER, REPLY, sig)).toBe(true);
  });

  it('signs the same reply the same way every time', () => {
    expect(signReply(SECRET, USER, REPLY)).toBe(signReply(SECRET, USER, REPLY));
  });

  it('refuses a reply signed for another user', () => {
    const sig = signReply(SECRET, OTHER_USER, REPLY);
    expect(verifyReply(SECRET, USER, REPLY, sig)).toBe(false);
  });

  it('refuses a reply whose text was changed', () => {
    const sig = signReply(SECRET, USER, REPLY);
    expect(verifyReply(SECRET, USER, `${REPLY} `, sig)).toBe(false);
    expect(verifyReply(SECRET, USER, REPLY.toUpperCase(), sig)).toBe(false);
    expect(verifyReply(SECRET, USER, '', sig)).toBe(false);
  });

  it('refuses a signature made with another secret', () => {
    const sig = signReply('t'.repeat(MIN_SECRET_CHARS), USER, REPLY);
    expect(verifyReply(SECRET, USER, REPLY, sig)).toBe(false);
  });

  it('does not let text move between the user id and the reply', () => {
    // Joined end to end, each pair here would be the same bytes.
    const pairs: [string, string, string, string][] = [
      ['ab', 'c', 'a', 'bc'],
      ['a', '', '', 'a'],
      ['a","b', 'c', 'a', 'b","c'],
      ['a', 'b"]', 'a","b', ''],
    ];
    for (const [userA, replyA, userB, replyB] of pairs) {
      const sig = signReply(SECRET, userA, replyA);
      expect(verifyReply(SECRET, userA, replyA, sig)).toBe(true);
      expect(verifyReply(SECRET, userB, replyB, sig)).toBe(false);
    }
  });

  it('refuses a truncated, padded or lengthened signature', () => {
    const sig = signReply(SECRET, USER, REPLY);
    expect(verifyReply(SECRET, USER, REPLY, sig.slice(0, -1))).toBe(false);
    expect(verifyReply(SECRET, USER, REPLY, sig.slice(1))).toBe(false);
    expect(verifyReply(SECRET, USER, REPLY, `${sig}=`)).toBe(false);
    expect(verifyReply(SECRET, USER, REPLY, `${sig}A`)).toBe(false);
    expect(verifyReply(SECRET, USER, REPLY, ` ${sig}`)).toBe(false);
  });

  it('refuses the same signature spelt as plain base64 or hex', () => {
    const sig = signReply(SECRET, USER, REPLY);
    const bytes = Buffer.from(sig, 'base64url');
    expect(verifyReply(SECRET, USER, REPLY, bytes.toString('base64'))).toBe(
      false
    );
    expect(verifyReply(SECRET, USER, REPLY, bytes.toString('hex'))).toBe(false);
  });

  it('refuses garbage of the right length', () => {
    expect(verifyReply(SECRET, USER, REPLY, 'A'.repeat(43))).toBe(false);
    expect(verifyReply(SECRET, USER, REPLY, '!'.repeat(43))).toBe(false);
    // 43 characters, more than 43 bytes.
    expect(verifyReply(SECRET, USER, REPLY, 'é'.repeat(43))).toBe(false);
  });

  it('refuses an empty, missing or non-text signature without throwing', () => {
    const sig = signReply(SECRET, USER, REPLY);
    for (const bad of [
      '',
      undefined,
      null,
      0,
      43,
      true,
      {},
      [sig],
      { length: 43 },
      Buffer.from(sig),
    ]) {
      expect(verifyReply(SECRET, USER, REPLY, bad)).toBe(false);
    }
  });

  it('refuses an enormous signature', () => {
    expect(verifyReply(SECRET, USER, REPLY, 'A'.repeat(1_000_000))).toBe(false);
  });

  it('verifies nothing when there is no secret', () => {
    const sig = signReply('', USER, REPLY);
    expect(verifyReply('', USER, REPLY, sig)).toBe(false);
    expect(verifyReply(undefined as unknown as string, USER, REPLY, sig)).toBe(
      false
    );
  });

  it('signs text outside ASCII, lone surrogates included', () => {
    for (const reply of ['Baha sa kalyé 🌧️', '\ud83d', 'line\nbreak\u0000']) {
      const sig = signReply(SECRET, USER, reply);
      expect(verifyReply(SECRET, USER, reply, sig)).toBe(true);
    }
    // The two halves of one emoji are not the emoji's own signature.
    expect(signReply(SECRET, USER, '\ud83d')).not.toBe(
      signReply(SECRET, USER, '\ude00')
    );
  });
});

describe('readHistorySecret', () => {
  it('reads a secret that is long enough', () => {
    expect(readHistorySecret({ CHATBOT_HISTORY_SECRET: SECRET })).toBe(SECRET);
  });

  it('gives null for a short, empty or missing secret', () => {
    expect(
      readHistorySecret({
        CHATBOT_HISTORY_SECRET: 's'.repeat(MIN_SECRET_CHARS - 1),
      })
    ).toBeNull();
    expect(readHistorySecret({ CHATBOT_HISTORY_SECRET: '' })).toBeNull();
    expect(readHistorySecret({})).toBeNull();
  });
});
