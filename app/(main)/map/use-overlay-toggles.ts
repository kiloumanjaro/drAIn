import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { OVERLAY_CONFIG } from '@/lib/map/config';
import {
  ALL_FLOOD_PRONE_HIDDEN,
  FLOOD_PRONE_AREAS,
  type FloodProneVisibility,
} from '@/lib/map/flood-prone-areas';
import {
  FLOOD_PRONE_HIDDEN_NOTICE,
  INITIAL_OVERLAY_VISIBILITY,
  MAP_LAYERS_HIDDEN_NOTICE,
  MAP_LAYER_OVERLAYS_HIDDEN,
  NOTICE_DELAY_MS,
  allOverlays,
  anyMapLayerOverlayVisible,
  anyVisible,
  createDebouncedNotice,
} from '@/lib/map/overlay-toggles';

/**
 * The overlays panel's switches: which map overlays and which flood-prone
 * areas are shown.
 *
 * The two groups are hard to read drawn over each other, so switching one
 * group on hides the other and says so. This only holds the switches;
 * applying them to the map is the page's job.
 */
export function useOverlayToggles() {
  const [overlayVisibility, setOverlayVisibility] = useState(
    INITIAL_OVERLAY_VISIBILITY
  );
  const [floodProneVisibility, setFloodProneVisibility] =
    useState<FloodProneVisibility>(ALL_FLOOD_PRONE_HIDDEN);

  const [notice] = useState(() =>
    createDebouncedNotice((message) => toast.info(message), NOTICE_DELAY_MS)
  );
  useEffect(() => notice.cancel, [notice]);

  const handleOverlayToggle = (layerId: string) => {
    const isCurrentlyVisible =
      overlayVisibility[layerId as keyof typeof overlayVisibility];
    const newVisibility = !isCurrentlyVisible;

    setOverlayVisibility((prev) => ({
      ...prev,
      [layerId]: newVisibility,
    }));

    // If turning on an overlay, hide all flood prone areas
    if (newVisibility && anyVisible(floodProneVisibility)) {
      setFloodProneVisibility(ALL_FLOOD_PRONE_HIDDEN);
      notice.announce(FLOOD_PRONE_HIDDEN_NOTICE);
    }
  };

  const handleToggleFloodProneArea = (areaId: string) => {
    const isCurrentlyVisible =
      floodProneVisibility[areaId as keyof typeof floodProneVisibility];
    const newVisibility = !isCurrentlyVisible;

    setFloodProneVisibility((prev) => ({
      ...prev,
      [areaId]: newVisibility,
    }));

    // If turning on a flood prone area, hide all overlays except reports
    if (newVisibility && anyMapLayerOverlayVisible(overlayVisibility)) {
      setOverlayVisibility((prev) => ({
        ...prev,
        ...MAP_LAYER_OVERLAYS_HIDDEN,
      }));
      notice.announce(MAP_LAYERS_HIDDEN_NOTICE);
    }
  };

  const handleToggleAllOverlays = () => {
    const someVisible = anyVisible(overlayVisibility);

    setOverlayVisibility((prev) =>
      allOverlays(!someVisible, prev['mandaue_population-layer'])
    );

    // If turning on overlays, hide all flood prone areas for clarity
    if (!someVisible && anyVisible(floodProneVisibility)) {
      setFloodProneVisibility(ALL_FLOOD_PRONE_HIDDEN);
      notice.announce(FLOOD_PRONE_HIDDEN_NOTICE);
    }
  };

  const overlayData = OVERLAY_CONFIG.map((config) => ({
    ...config,
    visible: overlayVisibility[config.id as keyof typeof overlayVisibility],
  }));

  const floodProneAreasData = FLOOD_PRONE_AREAS.map((area) => ({
    id: area.id,
    name: area.name,
    color: area.color,
    visible: floodProneVisibility[area.id] ?? false,
  }));

  // Check if any overlay OR any flood prone area is visible
  const someVisible =
    anyVisible(overlayVisibility) || anyVisible(floodProneVisibility);

  return {
    overlayVisibility,
    floodProneVisibility,
    overlayData,
    floodProneAreasData,
    someVisible,
    handleOverlayToggle,
    handleToggleFloodProneArea,
    handleToggleAllOverlays,
  };
}
