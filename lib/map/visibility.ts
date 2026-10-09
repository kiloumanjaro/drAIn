import type mapboxgl from 'mapbox-gl';

function setLayerVisibility(
  map: mapboxgl.Map,
  layerId: string,
  isVisible: boolean
): void {
  map.setLayoutProperty(layerId, 'visibility', isVisible ? 'visible' : 'none');
}

/**
 * Show or hide each overlay layer to match the panel's switches.
 *
 * A layer's click target (`<name>-hit-layer`) follows it, so a hidden layer
 * can't be clicked. The population overlay is two layers: its outline is in
 * `layerIds`, and its fill, which takes the hover and click, follows the
 * same switch. Layers the style doesn't have yet are skipped.
 */
export function applyOverlayVisibility(
  map: mapboxgl.Map,
  layerIds: readonly string[],
  overlayVisibility: Readonly<Record<string, boolean>>
): void {
  layerIds.forEach((layerId) => {
    if (!map.getLayer(layerId)) return;
    const isVisible = overlayVisibility[layerId];
    setLayerVisibility(map, layerId, isVisible);

    const hitLayerId = layerId.replace('-layer', '-hit-layer');
    if (map.getLayer(hitLayerId)) {
      setLayerVisibility(map, hitLayerId, isVisible);
    }
  });

  if (map.getLayer('mandaue_population-fill')) {
    setLayerVisibility(
      map,
      'mandaue_population-fill',
      overlayVisibility['mandaue_population-layer']
    );
  }
}

/** Show or hide each flood-prone area's layer (`<area id>-layer`). */
export function applyFloodProneVisibility(
  map: mapboxgl.Map,
  floodProneVisibility: Readonly<Record<string, boolean>>
): void {
  Object.entries(floodProneVisibility).forEach(([areaId, isVisible]) => {
    const layerId = `${areaId}-layer`;
    if (map.getLayer(layerId)) {
      setLayerVisibility(map, layerId, isVisible);
    }
  });
}
