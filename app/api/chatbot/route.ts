import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SYSTEM_INSTRUCTION } from '@/lib/chatbot/prompts';
import {
  readHistorySecret,
  signReply,
  verifyReply,
} from '@/lib/chatbot/history-signature';
import {
  MAX_BODY_BYTES,
  parseChatRequest,
  trustedHistory,
} from '@/lib/chatbot/request';
import { looksLikeLiveJwt } from '@/lib/chatbot/token';
import { readTextCapped } from '@/lib/http/read-body';
import { createRequestClient } from '@/lib/supabase/server';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * A reply long enough for any answer the assistant should give. One this
 * long comes back as an assistant turn, so MAX_REPLY_CHARS in
 * lib/chatbot/request.ts is sized to it; raise the two together.
 */
const MAX_OUTPUT_TOKENS = 1024;

/** Set once the missing-secret warning is logged, so it is logged once. */
let warnedNoSecret = false;

const signInRequired = () =>
  NextResponse.json(
    { error: 'Sign in to use the assistant.' },
    { status: 401 }
  );

/**
 * Every message is a paid model call, so the route is for signed-in users
 * only, each with an allowance the database keeps (consume_rate_limit in
 * supabase/schemas/schema_ops.sql). It used to be open to anyone, with no
 * limit on how often or how much.
 */
export async function POST(req: NextRequest) {
  if (!genAI) {
    return NextResponse.json(
      { error: 'Chatbot is not configured.' },
      { status: 503 }
    );
  }

  // Cheapest checks first: a missing token and the size and shape of the
  // body cost nothing to refuse, while checking the token is a call to the
  // auth server. So is a token that could never pass that check (not a JWT,
  // or one that says it has expired): it gets the same answer without the
  // call. looksLikeLiveJwt verifies nothing; auth.getUser below still does.
  const authorization = req.headers.get('authorization');
  const token = authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !looksLikeLiveJwt(token)) {
    return signInRequired();
  }

  const text = await readTextCapped(req, MAX_BODY_BYTES);
  if (text === null) {
    return NextResponse.json(
      { error: 'That message is too large.' },
      { status: 413 }
    );
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Send a JSON object.' }, { status: 400 });
  }
  const parsed = parseChatRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const supabase = createRequestClient(authorization);
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  if (!user) {
    return signInRequired();
  }

  // Counted only once the request is known to be valid and signed in.
  const { data: allowed, error: limitError } = await supabase.rpc(
    'consume_rate_limit',
    { p_bucket: 'chatbot' }
  );
  if (limitError) {
    console.error('Chatbot rate limit check failed:', limitError);
    return NextResponse.json(
      { error: 'The assistant is unavailable right now.' },
      { status: 503 }
    );
  }
  if (!allowed) {
    return NextResponse.json(
      {
        error:
          "You've sent a lot of messages recently. Please wait a few minutes.",
      },
      { status: 429, headers: { 'Retry-After': '600' } }
    );
  }

  // parsed.history is untrusted client input: the browser holds the
  // conversation, "assistant" turns included. Only the assistant turns this
  // server signed for this user reach the model as its own words, each with
  // the question it answered; the rest are dropped. Without a secret nothing
  // can be checked, so none are kept and the model gets the new message only.
  const secret = readHistorySecret();
  if (!secret && !warnedNoSecret) {
    warnedNoSecret = true;
    console.warn(
      'CHATBOT_HISTORY_SECRET is unset or shorter than 32 characters. The assistant will be shown none of the earlier conversation, only the new message.'
    );
  }
  const { history, input } = trustedHistory(
    parsed.history,
    parsed.input,
    (content, sig) => !!secret && verifyReply(secret, user.id, content, sig)
  );

  try {
    // The instructions go in as systemInstruction, apart from the
    // conversation, so nothing in the history can be given that standing.
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS },
    });
    const result = await model.generateContent({
      contents: [
        ...history.map((turn) => ({
          role: turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: turn.content }],
        })),
        { role: 'user', parts: [{ text: input }] },
      ],
    });

    // Signed exactly as sent: the app keeps this string untouched and sends
    // it back as an assistant turn, and a changed character fails the check.
    const text = result.response.text();
    return NextResponse.json(
      secret ? { text, sig: signReply(secret, user.id, text) } : { text }
    );
  } catch (error) {
    // The provider's message can carry request details; log it, don't
    // return it.
    console.error('Chatbot API error:', error);
    return NextResponse.json(
      { error: 'The assistant could not answer. Please try again.' },
      { status: 502 }
    );
  }
}
