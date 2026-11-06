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

interface ClosestPipesResponse {
  success: boolean;
  count: number;
  results: PipeResult[];
}

/** Needs the signed-in user's access token: the route is for the report form. */
export async function getClosestPipes(
  location: Location,
  category: string,
  accessToken: string
): Promise<PipeResult[]> {
  try {
    const response = await fetch('/api/closest-pipe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ location, category }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch closest pipes');
    }

    const data: ClosestPipesResponse = await response.json();
    return data.results;
  } catch (error) {
    console.error('Error fetching closest pipes:', error);
    throw error;
  }
}
