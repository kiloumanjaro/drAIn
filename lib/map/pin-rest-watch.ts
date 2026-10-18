import type mapboxgl from 'mapbox-gl';
import {
  PIN_REST_CHECKS,
  reportPinOffRest,
  reportPinRecentre,
  type MapPoint,
} from '@/lib/map/report-pin';

/**
 * What ends the watch on each map for a pin coming to rest (see
 * settlePinAtRest). A map has one at a time.
 */
const restWatches = new WeakMap<mapboxgl.Map, () => void>();

/**
 * Move the pin the rest of the way to its rest. The move that sends it
 * there aims at its place on flat ground. How high the ground is the map
 * knows only once it has loaded it, which can be after the move has ended
 * and always is for a jump, so the pin is looked at when the move ends and
 * each time the map falls idle after that, and moved by what is left. Any
 * other move ends the watch: the pin stays where the visitor, or the next
 * pin opened, puts it.
 */
export function settlePinAtRest(
  map: mapboxgl.Map,
  coordinates: [number, number],
  rest: MapPoint
) {
  let checksLeft = PIN_REST_CHECKS;
  let correcting = false;

  const check = () => {
    checksLeft -= 1;
    if (checksLeft === 0) end();
    if (!reportPinOffRest(map.project(coordinates), rest)) return;
    correcting = true;
    map.easeTo({
      center: reportPinRecentre(
        map.getCenter().toArray(),
        coordinates,
        map.unproject([rest.x, rest.y]).toArray()
      ),
      duration: 300,
    });
    correcting = false;
  };
  const giveWay = () => {
    if (!correcting) end();
  };
  const end = () => {
    map.off('moveend', check);
    map.off('idle', check);
    map.off('movestart', giveWay);
    restWatches.delete(map);
  };

  // A move made without animation has ended already.
  if (map.isMoving()) map.once('moveend', check);
  map.on('idle', check);
  map.on('movestart', giveWay);
  restWatches.set(map, end);
}

/** End the map's pin watch, if it has one. */
export function endPinRestWatch(map: mapboxgl.Map) {
  restWatches.get(map)?.();
}
