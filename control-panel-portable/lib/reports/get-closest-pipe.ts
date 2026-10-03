// Mock of the closest-pipe lookup for the portable bundle.
// Original POSTed to /api/closest-pipe; this returns an empty list (no backend).

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

export async function getClosestPipes(
  _location: Location,
  _category: string
): Promise<PipeResult[]> {
  return [];
}
