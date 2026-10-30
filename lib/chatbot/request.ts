/**
 * Validating what the browser sends the chatbot route. Every message costs a
 * paid model call, and the conversation is passed to the model, so size and
 * shape are checked before anything is spent.
 */

/** Longest single message accepted from the user, in characters. */
export const MAX_MESSAGE_CHARS = 2000;

/**
 * Longest reply accepted back as an assistant turn, in characters. Replies
 * are capped in tokens, not characters (MAX_OUTPUT_TOKENS in the route), and
 * a full one runs well past MAX_MESSAGE_CHARS; this leaves room for it. A
 * signed reply cannot be cut to fit, because the signature covers its exact
 * text.
 */
export const MAX_REPLY_CHARS = 6000;

/**
 * Earlier turns passed back to the model; older ones are dropped. Even, so
 * what is kept is whole exchanges (a question and its reply).
 */
export const MAX_HISTORY_TURNS = 12;

/**
 * Turns the app sends back with each message: the most recent ones. Even,
 * for the same reason.
 */
export const HISTORY_WINDOW = 8;

/**
 * Most turns a request may carry. The app sends the last HISTORY_WINDOW; a
 * longer list is not from the app, and is refused before any turn is looked
 * at, so the checks below never walk a list of a size the caller chose.
 */
export const MAX_HISTORY_ITEMS = 50;

/**
 * Longest signature a turn may carry, in characters. A real one is 43 (see
 * history-signature.ts); the room above that is for a longer hash later.
 */
export const MAX_SIG_CHARS = 128;

/**
 * Largest request body read, in bytes. The longest request the app can send
 * (a full message and 4 full exchanges, each a full question and a full
 * signed reply, all of 3-byte characters) is about 103 KB.
 */
export const MAX_BODY_BYTES = 128 * 1024;

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  /**
   * The signature the server sent with this reply. Only assistant turns have
   * one; on a user turn it is ignored.
   */
  sig?: string;
}

export type ParsedChatRequest =
  | { ok: true; input: string; history: ChatTurn[] }
  | { ok: false; error: string };

function isTurn(value: unknown): value is ChatTurn {
  if (!value || typeof value !== 'object') return false;
  const { role, content, sig } = value as Record<string, unknown>;
  return (
    (role === 'user' || role === 'assistant') &&
    typeof content === 'string' &&
    (sig === undefined ||
      (typeof sig === 'string' && sig.length <= MAX_SIG_CHARS))
  );
}

/**
 * Check a request body. History is structured (who said what) rather than
 * the "User: ..." lines it used to be, so the model gets real turns and a
 * client can't smuggle instructions in as if the system had written them.
 *
 * The history is untrusted: the browser holds the conversation and sends it
 * back, so a caller can write "assistant" turns the model never said. This
 * only checks size and shape, which can be done before the caller is known.
 * Which assistant turns are real is settled afterwards, by trustedHistory
 * below, and the route passes the model nothing that has not been through
 * it. The assistant's own instructions are not part of the history (the
 * route passes them as the model's systemInstruction), so no turn can
 * replace them.
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
  // A reply may be longer than a message. A caller can use that room for an
  // assistant turn of its own, but trustedHistory drops any the server did
  // not sign.
  if (
    history.some(
      (turn) =>
        turn.content.length >
        (turn.role === 'assistant' ? MAX_REPLY_CHARS : MAX_MESSAGE_CHARS)
    )
  ) {
    return { ok: false, error: 'A message in the history is too long.' };
  }

  const recent = history.slice(-MAX_HISTORY_TURNS);
  // The model expects a conversation to open with the user, so leading
  // assistant turns are dropped (the window the app sends can start on one).
  const firstUser = recent.findIndex((turn) => turn.role === 'user');
  return {
    ok: true,
    input: input.trim(),
    history: firstUser === -1 ? [] : recent.slice(firstUser),
  };
}

/**
 * The part of a parsed history the model may be shown, and the message to
 * send after it.
 *
 * An assistant turn is kept only if `verify` accepts its signature, which
 * the route checks against the signed-in user (history-signature.ts). One
 * with no signature, or one that fails, is dropped: it is text the caller
 * wrote, and passing it on as the model's own words would let a caller steer
 * the model with things it never said.
 *
 * A user turn is kept only with the reply to it: the assistant turn right
 * after it, when that one is kept. So the history is whole exchanges the
 * model really had, a user turn and then its reply, and `input` follows as
 * the user's next message, unchanged. A question whose reply is missing (no
 * secret is set, the secret changed, the request failed, the reply was too
 * long to send back) is dropped with it. Such questions used to be joined
 * onto the front of `input`, which handed the model questions it had already
 * answered as part of the new message.
 *
 * At most MAX_HISTORY_TURNS turns survive, the most recent ones.
 */
export function trustedHistory(
  turns: readonly ChatTurn[],
  input: string,
  verify: (content: string, sig: string) => boolean
): { history: ChatTurn[]; input: string } {
  const history: ChatTurn[] = [];
  // The user turn waiting for its reply, if the last turn seen was one.
  let asked: ChatTurn | undefined;
  for (const turn of turns) {
    if (turn.role === 'user') {
      asked = turn;
      continue;
    }
    if (
      asked &&
      typeof turn.sig === 'string' &&
      verify(turn.content, turn.sig)
    ) {
      history.push(
        { role: 'user', content: asked.content },
        { role: 'assistant', content: turn.content }
      );
    }
    asked = undefined;
  }
  return { history: history.slice(-MAX_HISTORY_TURNS), input };
}

/** A message as the chat panel holds it. */
interface PanelMessage {
  role: 'user' | 'bot';
  content: string;
  sig?: string;
}

/**
 * The history the app sends with a new message: the last HISTORY_WINDOW
 * turns of the real conversation, as whole exchanges. An exchange is a user
 * message and the signed reply right after it. Bot messages the server did
 * not sign (the greeting, the apology shown when a request fails) are the
 * app's own words rather than the model's, and the server would drop them,
 * and the question before them, anyway (see trustedHistory).
 *
 * A request carrying a turn over its cap is refused whole, so an exchange
 * with one is left out as well. A reply can still run past MAX_REPLY_CHARS:
 * its cap at the model is in tokens.
 */
export function historyToSend(messages: readonly PanelMessage[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  messages.forEach((msg, i) => {
    const reply = messages.at(i + 1);
    if (
      msg.role === 'user' &&
      msg.content.length <= MAX_MESSAGE_CHARS &&
      reply?.role === 'bot' &&
      typeof reply.sig === 'string' &&
      reply.content.length <= MAX_REPLY_CHARS
    ) {
      turns.push(
        { role: 'user', content: msg.content },
        { role: 'assistant', content: reply.content, sig: reply.sig }
      );
    }
  });
  return turns.slice(-HISTORY_WINDOW);
}
