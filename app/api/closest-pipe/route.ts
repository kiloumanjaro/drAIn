import { NextRequest, NextResponse } from 'next/server';
import { looksLikeLiveJwt } from '@/lib/chatbot/token';
import { readTextCapped } from '@/lib/http/read-body';
import { createRequestClient } from '@/lib/supabase/server';
import { isComponentType } from '@/lib/supabase/enums';

/** A position and a category; anything bigger is not this request. */
const MAX_BODY_BYTES = 1024;

const signInRequired = () =>
  NextResponse.json(
    { error: 'Sign in to look up nearby components.' },
    { status: 401 }
  );

interface Location {
  lat: number;
  lon: number;
}

interface PipeResult {
  name: string;
  lat: number;
  long: number;
  distance: number;
}

/**
 * Only the signed-in report form calls this, so it asks for a sign-in and
 * spends a rate-limit allowance like the chatbot route (the same order:
 * the cheap refusals first, the auth server last).
 */
export async function POST(req: NextRequest) {
  const authorization = req.headers.get('authorization');
  const token = authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !looksLikeLiveJwt(token)) {
    return signInRequired();
  }

  const text = await readTextCapped(req, MAX_BODY_BYTES);
  if (text === null) {
    return NextResponse.json(
      { error: 'That request is too large.' },
      { status: 413 }
    );
  }

  const supabase = createRequestClient(authorization);

  try {
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: 'Send a JSON object.' },
        { status: 400 }
      );
    }
    const { location, category } = (body ?? {}) as {
      location?: Location;
      category?: unknown;
    };

    // Validate input
    if (
      !location ||
      !Number.isFinite(location.lat) ||
      !Number.isFinite(location.lon) ||
      Math.abs(location.lat) > 90 ||
      Math.abs(location.lon) > 180
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid location. Must provide latitude and longitude as numbers.',
        },
        { status: 400 }
      );
    }

    // A number or object here used to reach .toLowerCase() and answer 500.
    if (!category || typeof category !== 'string') {
      return NextResponse.json(
        { error: 'Category is required.' },
        { status: 400 }
      );
    }

    // Accepted in any case, as before.
    const type = category.toLowerCase();
    if (!isComponentType(type)) {
      return NextResponse.json(
        {
          error: `Invalid category: ${category}. Must be one of: inlets, outlets, storm_drains, man_pipes.`,
        },
        { status: 400 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (!user) {
      return signInRequired();
    }

    // Counted only once the request is known to be valid and signed in.
    const { data: allowed, error: limitError } = await supabase.rpc(
      'consume_rate_limit',
      { p_bucket: 'closest_pipe' }
    );
    if (limitError) {
      console.error('closest-pipe rate limit check failed:', limitError);
      return NextResponse.json(
        { error: 'Failed to fetch closest pipes.' },
        { status: 503 }
      );
    }
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many lookups in a row. Please wait a while.' },
        { status: 429 }
      );
    }

    // The three nearest components of that type within 50 m.
    const { data, error } = await supabase.rpc('nearest_components', {
      p_type: type,
      p_lat: location.lat,
      p_lon: location.lon,
    });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch closest pipes.' },
        { status: 500 }
      );
    }

    // Transform and return results
    const results: PipeResult[] = data || [];

    return NextResponse.json({
      success: true,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
