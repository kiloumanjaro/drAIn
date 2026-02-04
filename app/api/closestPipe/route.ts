import { NextRequest, NextResponse } from 'next/server';
import server from '@/app/api/server';

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
  const supabase = server;

  try {
    const body = await req.json();
    const { location, category }: { location: Location; category: string } =
      body;

    // Validate input
    if (
      !location ||
      typeof location.lat !== 'number' ||
      typeof location.lon !== 'number'
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid location. Must provide latitude and longitude as numbers.',
        },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required.' },
        { status: 400 }
      );
    }

    // Determine which RPC function to call based on category
    let rpcFunction: string;
    switch (category.toLowerCase()) {
      case 'inlets':
        rpcFunction = 'get_closest_inlet';
        break;
      case 'outlets':
        rpcFunction = 'get_closest_outlet';
        break;
      case 'man_pipes':
        rpcFunction = 'get_closest_man_pipe';
        break;
      case 'storm_drains':
        rpcFunction = 'get_closest_storm_drain';
        break;
      default:
        return NextResponse.json(
          {
            error: `Invalid category: ${category}. Must be one of: inlet, outlet, manhole, junction.`,
          },
          { status: 400 }
        );
    }

    // Call the appropriate RPC function
    const { data, error } = await supabase.rpc(rpcFunction, {
      input_lat: location.lat,
      input_lon: location.lon,
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
