'use client';

import { useEffect, useRef, type RefObject } from 'react';

/**
 * Keeps a ref pointing at the most recent value.
 *
 * Long-lived callbacks registered outside React — Mapbox event handlers,
 * animation frames — close over the render they were created in and would
 * otherwise read stale state. Reading through this ref always sees the
 * latest value without re-registering the handler.
 */
export function useLatestRef<T>(value: T): RefObject<T> {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
}
