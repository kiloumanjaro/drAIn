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

export async function getClosestPipes(
  location: Location,
  category: string
): Promise<PipeResult[]> {
  try {
    const response = await fetch('/api/closestPipe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
