import { NextRequest, NextResponse } from 'next/server';
import { createRequestClient } from '@/lib/supabase/server';
import { isComponentType } from '@/lib/supabase/enums';

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

export async function POST(req: NextRequest) {
  // Component locations are public; no user is needed.
  const supabase = createRequestClient();

  try {
    const body = await req.json();
    const { location, category }: { location: Location; category: string } =
      body;

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
