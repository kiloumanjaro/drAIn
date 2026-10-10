import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { floodEventKeys } from '@/lib/query/keys';
import { parseFloodEvents } from '@/lib/docs/flood-events';
import type { FloodEvent } from '@/components/docs-page/flood-event-cards';

async function fetchFloodEvents(): Promise<FloodEvent[]> {
  const res = await fetch('/api/reports');
  if (!res.ok) {
    throw new Error(`Failed to load flood reports (${res.status})`);
  }
  // A body that is not JSON is treated like one with no events.
  const body: unknown = await res.json().catch(() => null);
  return parseFloodEvents(body);
}

/**
 * Fetch the historical flood events with TanStack Query, oldest first
 * 15 minute cache for a static JSON file
 */
export function useFloodEvents(): UseQueryResult<FloodEvent[], Error> {
  return useQuery({
    queryKey: floodEventKeys.list(),
    queryFn: fetchFloodEvents,
    staleTime: 15 * 60 * 1000, // 15 minutes - the file only changes on deploy
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 2, // Retry twice for static assets
  });
}
