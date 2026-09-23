import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { mapKeys } from '@/lib/query/keys';
import { getInlets, getOutlets, getPipes, getDrains } from '@/lib/map/queries';
import type {
  Inlet,
  Outlet,
  Pipe,
  Drain,
} from '@/components/control-panel/types';

/**
 * Fetch inlets with TanStack Query
 * 15 minute cache for static GeoJSON data
 */
export function useInlets(): UseQueryResult<Inlet[], Error> {
  return useQuery({
    queryKey: mapKeys.drainageDetails().inlets(),
    queryFn: getInlets,
    staleTime: 15 * 60 * 1000, // 15 minutes - GeoJSON rarely changes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: 2, // Retry twice for static assets
  });
}

/**
 * Fetch outlets with TanStack Query
 * 15 minute cache for static GeoJSON data
 */
export function useOutlets(): UseQueryResult<Outlet[], Error> {
  return useQuery({
    queryKey: mapKeys.drainageDetails().outlets(),
    queryFn: getOutlets,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Fetch pipes with TanStack Query
 * 15 minute cache for static GeoJSON data
 */
export function usePipes(): UseQueryResult<Pipe[], Error> {
  return useQuery({
    queryKey: mapKeys.drainageDetails().pipes(),
    queryFn: getPipes,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Fetch drains with TanStack Query
 * 15 minute cache for static GeoJSON data
 */
export function useDrains(): UseQueryResult<Drain[], Error> {
  return useQuery({
    queryKey: mapKeys.drainageDetails().drains(),
    queryFn: getDrains,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 2,
  });
}
