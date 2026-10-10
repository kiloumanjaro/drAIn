import type mapboxgl from 'mapbox-gl';
import { COMPACT_MAP_QUERY, isCompactMap } from '@/lib/layout/compact-map';

/**
 * Put "© Mapbox © OpenStreetMap" on the map, where it can be seen, and keep
 * it there.
 *
 * On phones and tablets the control sheet covers the bottom of the map, so
 * it sits at the top left (beside the navigation button on phones);
 * otherwise bottom right, clear of the panel on the left. (app/globals.css
 * nudges it off the app's buttons in each corner.)
 *
 * The corner used to be chosen once, for the layout the page opened in. A
 * tablet turned on its side changes layout (768px wide one way, 1024px the
 * other), which left the attribution under the sheet or the panel until the
 * page was reloaded. So it is moved whenever the layout changes, for as long
 * as the map lives.
 */
export function keepAttributionOnShow(
  map: mapboxgl.Map,
  attribution: mapboxgl.AttributionControl
): void {
  const corner = () => (isCompactMap() ? 'top-left' : 'bottom-right');
  map.addControl(attribution, corner());

  const layout = window.matchMedia(COMPACT_MAP_QUERY);
  const move = () => {
    map.removeControl(attribution);
    map.addControl(attribution, corner());
  };
  layout.addEventListener('change', move);
  // Fired by map.remove(): a removed map must not be handed controls.
  map.once('remove', () => layout.removeEventListener('change', move));
}
