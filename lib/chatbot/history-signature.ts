/**
 * Signing the assistant's replies, so the chatbot route can tell its own
 * earlier answers from text a caller wrote and labelled "assistant". The
 * browser holds the conversation and sends it back with every message; a
 * reply comes back with the signature it left with, and one that doesn't
 * check out is not passed to the model as something the model said.
 *
 * A signature says "the model gave this text to this user", nothing more. It
 * is not tied to a conversation or a position in one, so a user can send
 * their own old replies back in another order. That only rearranges things
 * the model really told them. Another user's reply does not verify.
 *
 * Server only: this reads a secret and uses node:crypto. Nothing the browser
 * loads may import it. (Not `import 'server-only'`: that package throws when
 * loaded outside a server build, the unit tests included.)
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

/** Shortest secret accepted, in characters. */
export const MIN_SECRET_CHARS = 32;

/**
 * Names what is being signed. Change it if the signed fields ever change, so
 * a signature made the old way can't be read the new way.
 */
const VERSION = 'chatbot-reply-v1';

/**
 * Sign a reply for the user it was given to; base64url, 43 characters.
 *
 * The fields are signed as a JSON array rather than joined end to end, so
 * where one stops and the next starts is part of what is signed: user "ab"
 * with reply "c" and user "a" with reply "bc" sign differently.
 */
export function signReply(
  secret: string,
  userId: string,
  content: string
): string {
  return createHmac('sha256', secret)
    .update(JSON.stringify([VERSION, userId, content]))
    .digest('base64url');
}

/**
 * True if `sig` is the signature `signReply` gives this reply for this user.
 * Anything else is false, and nothing here throws: `sig` is whatever the
 * caller sent.
 *
 * The signatures are compared as text, not decoded first, so there is one
 * accepted spelling of each (a decoder would also take padding and stray
 * characters), and a signature of the wrong length is refused unread.
 */
export function verifyReply(
  secret: string,
  userId: string,
  content: string,
  sig: unknown
): boolean {
  try {
    if (
      typeof secret !== 'string' ||
      !secret ||
      typeof userId !== 'string' ||
      typeof content !== 'string' ||
      typeof sig !== 'string'
    ) {
      return false;
    }
    const expected = signReply(secret, userId, content);
    if (sig.length !== expected.length) return false;
    const given = Buffer.from(sig, 'utf8');
    const wanted = Buffer.from(expected, 'utf8');
    // Equal in characters but not in bytes means non-ASCII, so not ours.
    if (given.length !== wanted.length) return false;
    return timingSafeEqual(given, wanted);
  } catch {
    return false;
  }
}

/**
 * The signing secret (CHATBOT_HISTORY_SECRET), or null if it is unset or
 * too short to be one. Without it the route signs nothing and trusts no
 * assistant turn.
 */
export function readHistorySecret(
  env: Record<string, string | undefined> = process.env
): string | null {
  const secret = env.CHATBOT_HISTORY_SECRET;
  return typeof secret === 'string' && secret.length >= MIN_SECRET_CHARS
    ? secret
    : null;
}
