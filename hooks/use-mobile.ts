'use client';

import { useSyncExternalStore } from 'react';
import { PHONE_QUERY } from '@/lib/map/report-pin';

/** False on the server, where there is no window to measure. */
export function isPhone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(PHONE_QUERY).matches;
}

export function subscribeToPhone(onChange: () => void): () => void {
  const query = window.matchMedia(PHONE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const notOnServer = () => false;

/**
 * Whether the navigation is in its phone layout (the drawer), on the same
 * `(width < 48rem)` query Tailwind's `max-md:` uses, so a window a fraction
 * of a pixel under 768px is a phone to both. Same shape as
 * lib/layout/use-compact-map.ts.
 */
export function useIsMobile() {
  return useSyncExternalStore(subscribeToPhone, isPhone, notOnServer);
}
