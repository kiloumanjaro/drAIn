import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SYSTEM_INSTRUCTION } from '@/lib/chatbot/prompts';
import { MAX_BODY_BYTES, parseChatRequest } from '@/lib/chatbot/request';
import { readTextCapped } from '@/lib/http/read-body';
import { createRequestClient } from '@/lib/supabase/server';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/** A reply long enough for any answer the assistant should give. */
const MAX_OUTPUT_TOKENS = 1024;

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
  // auth server.
  const authorization = req.headers.get('authorization');
  const token = authorization?.replace(/^Bearer\s+/i, '');
  if (!token) {
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

  try {
    // The instructions go in as systemInstruction, apart from the
    // conversation. parsed.history is untrusted client input (the browser
    // holds the conversation, "assistant" turns included), so nothing in it
    // may be given that standing.
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS },
    });
    const result = await model.generateContent({
      contents: [
        ...parsed.history.map((turn) => ({
          role: turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: turn.content }],
        })),
        { role: 'user', parts: [{ text: parsed.input }] },
      ],
    });

    return NextResponse.json({ text: result.response.text() });
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
