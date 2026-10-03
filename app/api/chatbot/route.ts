import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SYSTEM_INSTRUCTION } from '@/lib/chatbot/prompts';
import { parseChatRequest } from '@/lib/chatbot/request';
import { createRequestClient } from '@/lib/supabase/server';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/** A reply long enough for any answer the assistant should give. */
const MAX_OUTPUT_TOKENS = 1024;

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

  const authorization = req.headers.get('authorization');
  const token = authorization?.replace(/^Bearer\s+/i, '');
  const supabase = createRequestClient(authorization);
  const {
    data: { user },
  } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
  if (!user) {
    return NextResponse.json(
      { error: 'Sign in to use the assistant.' },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Send a JSON object.' }, { status: 400 });
  }
  const parsed = parseChatRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // Counted only once the request is known to be valid.
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
