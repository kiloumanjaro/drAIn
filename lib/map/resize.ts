import type mapboxgl from 'mapbox-gl';

/**
 * Keep a map the size of its container.
 *
 * Mapbox resizes itself only when the window does, so a container that
 * changed for another reason (the sidebar opening beside it) left the canvas
 * at its old size. Several changes in one frame cost one resize.
 *
 * `getMap` is asked on every change, so the container can be watched before
 * its map exists and after it has gone. Returns the function that stops
 * watching.
 */
export function keepMapSized(
  container: Element,
  getMap: () => mapboxgl.Map | null
): () => void {
  if (typeof ResizeObserver === 'undefined') return () => {};

  let frame: number | null = null;
  const observer = new ResizeObserver(() => {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      getMap()?.resize();
    });
  });
  observer.observe(container);

  return () => {
    observer.disconnect();
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  };
}
