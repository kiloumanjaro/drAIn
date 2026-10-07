/** The overlay switches in the panel. All but the population overlay start on. */
export const INITIAL_OVERLAY_VISIBILITY = {
  'man_pipes-layer': true,
  'storm_drains-layer': true,
  'inlets-layer': true,
  'outlets-layer': true,
  'reports-layer': true,
  'flood_hazard-layer': true,
  'mandaue_population-layer': false,
};

export type OverlayVisibility = typeof INITIAL_OVERLAY_VISIBILITY;

export const FLOOD_PRONE_HIDDEN_NOTICE =
  'Flood prone areas hidden to improve clarity with map layers';
export const MAP_LAYERS_HIDDEN_NOTICE =
  'Map layers hidden to improve clarity with flood prone areas';

/** How long a notice waits for a later one to replace it. */
export const NOTICE_DELAY_MS = 100;

/**
 * What showing a flood-prone area switches off: every overlay drawn as a map
 * layer. Report pins are not one of them and stay as they are.
 */
export const MAP_LAYER_OVERLAYS_HIDDEN = {
  'man_pipes-layer': false,
  'storm_drains-layer': false,
  'inlets-layer': false,
  'outlets-layer': false,
  'flood_hazard-layer': false,
  'mandaue_population-layer': false,
};

/** Every overlay switch, reports included, set the same way. */
export function allOverlays(visible: boolean): OverlayVisibility {
  return {
    'man_pipes-layer': visible,
    'storm_drains-layer': visible,
    'inlets-layer': visible,
    'outlets-layer': visible,
    'reports-layer': visible,
    'flood_hazard-layer': visible,
    'mandaue_population-layer': visible,
  };
}

/** True when any switch in the record is on. */
export function anyVisible(visibility: Record<string, boolean>): boolean {
  return Object.values(visibility).some(Boolean);
}

/** True when any overlay drawn as a map layer (so not the report pins) is on. */
export function anyMapLayerOverlayVisible(
  overlayVisibility: Record<string, boolean>
): boolean {
  return Object.entries(overlayVisibility).some(
    ([key, value]) => key !== 'reports-layer' && value
  );
}

/**
 * Show a notice a moment later, unless another replaces it first: several
 * switches flipped in one go produce one notice, the last one asked for.
 */
export function createDebouncedNotice(
  show: (message: string) => void,
  delayMs: number
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const cancel = () => {
    if (timeout) clearTimeout(timeout);
    timeout = null;
  };

  const announce = (message: string) => {
    cancel();
    timeout = setTimeout(() => {
      show(message);
      timeout = null;
    }, delayMs);
  };

  return { announce, cancel };
}
