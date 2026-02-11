# Map Query System

This directory contains the TanStack Query integration for the map page's GeoJSON data fetching.

## Files

### `queries.ts`

Core query functions that fetch and transform GeoJSON data.

**Exports:**

- `getInlets()` - Fetch and transform inlets from `/drainage/inlets.geojson`
- `getOutlets()` - Fetch and transform outlets from `/drainage/outlets.geojson`
- `getPipes()` - Fetch and transform pipes from `/drainage/man_pipes.geojson`
- `getDrains()` - Fetch and transform drains from `/drainage/storm_drains.geojson`
- `getAllDrainageData()` - Fetch all 4 datasets in parallel
- `GeoJSONFetchError` - Custom error class for fetch failures

**Error Handling:**
All functions throw `GeoJSONFetchError` which includes:

- `resource` - The GeoJSON file path
- `status` - HTTP status code (if available)
- `message` - Human-readable error message

## Usage in Map Page

The map page uses these queries through TanStack Query hooks in `lib/query/hooks/useDrainageData.ts`:

```typescript
import { useInlets, useOutlets, usePipes, useDrains } from '@/lib/query/hooks/useDrainageData';

// In component
const { data: inlets = [], isLoading, error } = useInlets();

if (error) {
  console.error('Failed to fetch inlets:', error.message);
}

if (isLoading) {
  return <div>Loading...</div>;
}

// Use inlets data...
```

## Cache Configuration

All drainage data queries use:

- **staleTime:** 15 minutes (data is static)
- **gcTime:** 1 hour (keep in memory)
- **retry:** 2 (retry on failure)

This means:

- First load: fetches from network
- Subsequent loads within 15 minutes: returns from cache
- After 15 minutes: marked stale, refetches in background

## Query Keys

Queries are organized with hierarchical keys:

```
['map', 'drainage', 'details', 'inlets']
['map', 'drainage', 'details', 'outlets']
['map', 'drainage', 'details', 'pipes']
['map', 'drainage', 'details', 'drains']
```

These are defined in `lib/query/keys.ts` under `mapKeys`.

## Debugging

Use React Query DevTools (available in development):

1. Click the DevTools icon in bottom-right corner
2. Inspect the queries to see:
   - Cache state
   - Stale time remaining
   - Fetch status
   - Data and errors

## Future Enhancements

- Parallel fetching with `useQueries` hook
- Prefetching on app load
- Manual refetch triggers
- Background refetch behavior customization
