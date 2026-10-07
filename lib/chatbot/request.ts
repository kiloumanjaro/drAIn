/**
 * Validating what the browser sends the chatbot route. Every message costs a
 * paid model call, and the conversation is passed to the model, so size and
 * shape are checked before anything is spent.
 */

/** Longest single message accepted, in characters. */
export const MAX_MESSAGE_CHARS = 2000;

/** Earlier turns passed back to the model; older ones are dropped. */
export const MAX_HISTORY_TURNS = 12;

/**
 * Most turns a request may carry. The app sends the last 6; a longer list is
 * not from the app, and is refused before any turn is looked at, so the
 * checks below never walk a list of a size the caller chose.
 */
export const MAX_HISTORY_ITEMS = 50;

/**
 * Largest request body read, in bytes. The longest request the app can send
 * (a full message and 6 full turns of 3-byte characters) is about 42 KB.
 */
export const MAX_BODY_BYTES = 64 * 1024;

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export type ParsedChatRequest =
  | { ok: true; input: string; history: ChatTurn[] }
  | { ok: false; error: string };

function isTurn(value: unknown): value is ChatTurn {
  if (!value || typeof value !== 'object') return false;
  const { role, content } = value as Record<string, unknown>;
  return (
    (role === 'user' || role === 'assistant') && typeof content === 'string'
  );
}

/**
 * Check a request body. History is structured (who said what) rather than
 * the "User: ..." lines it used to be, so the model gets real turns and a
 * client can't smuggle instructions in as if the system had written them.
 *
 * The history is untrusted: the browser holds the conversation and sends it
 * back, so a caller can write "assistant" turns the model never said. That
 * is accepted, since it only changes the answer that caller gets. The
 * assistant's own instructions are not part of the history (the route passes
 * them as the model's systemInstruction), so no turn can replace them.
 */
export function parseChatRequest(body: unknown): ParsedChatRequest {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Send a JSON object.' };
  }
  const { input, history = [] } = body as Record<string, unknown>;

  if (typeof input !== 'string' || !input.trim()) {
    return { ok: false, error: 'Input is required.' };
  }
  if (input.length > MAX_MESSAGE_CHARS) {
    return {
      ok: false,
      error: `Keep messages under ${MAX_MESSAGE_CHARS} characters.`,
    };
  }
  if (!Array.isArray(history)) {
    return {
      ok: false,
      error: 'History must be a list of { role, content } turns.',
    };
  }
  if (history.length > MAX_HISTORY_ITEMS) {
    return { ok: false, error: 'The history is too long.' };
  }
  if (!history.every(isTurn)) {
    return {
      ok: false,
      error: 'History must be a list of { role, content } turns.',
    };
  }
  if (history.some((turn) => turn.content.length > MAX_MESSAGE_CHARS)) {
    return { ok: false, error: 'A message in the history is too long.' };
  }

  const recent = history.slice(-MAX_HISTORY_TURNS);
  // The model expects a conversation to open with the user; the app's
  // greeting is an assistant turn, so leading assistant turns are dropped.
  const firstUser = recent.findIndex((turn) => turn.role === 'user');
  return {
    ok: true,
    input: input.trim(),
    history: firstUser === -1 ? [] : recent.slice(firstUser),
  };
}
