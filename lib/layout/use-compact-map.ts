'use client';

import { useSyncExternalStore } from 'react';
import { COMPACT_MAP_QUERY, isCompactMap } from './compact-map';

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(COMPACT_MAP_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const notOnServer = () => false;

/**
 * Whether the map pages are in their compact layout (see compact-map.ts),
 * kept up to date as the window is resized or the device turned. False on
 * the server and for the first render in the browser.
 */
export function useCompactMap(): boolean {
  return useSyncExternalStore(subscribe, isCompactMap, notOnServer);
}
