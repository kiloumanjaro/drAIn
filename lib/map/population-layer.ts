import mapboxgl from 'mapbox-gl';

import { escapeHtml } from '@/lib/escape-html';

const SOURCE = 'mandaue_population';
/** The fill takes the pointer; the outline layer is only drawn. */
const FILL_LAYER = 'mandaue_population-fill';

/** Inline CSS for the close button injected into the imperatively-built population popup. */
const POPULATION_POPUP_CLOSE_BUTTON_CSS =
  'position: absolute; width: 23px; height: 23px; top: -1px; right: -1px; background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 30px; transition: background-color 0.2s; background-color: #f3f4f6;';

/** Default background colour for the popup close button. */
const POPULATION_POPUP_CLOSE_BG = '#f3f4f6';

/** Hover background colour for the popup close button. */
const POPULATION_POPUP_CLOSE_BG_HOVER = '#e5e7eb';

/** The barangay the user clicked and the popup opened for it. */
export interface PopulationSelection {
  clickedId: string | null;
  popup: mapboxgl.Popup | null;
}

/**
 * Hover highlight, click-to-select and the details popup for the barangay
 * population overlay.
 *
 * Call once per map, when it is created: the handlers are registered against
 * the layer id and outlive style changes. `isVisible` is read on every event
 * because the overlay's switch changes long after registration.
 */
export function registerPopulationInteractions(
  map: mapboxgl.Map,
  selection: PopulationSelection,
  isVisible: () => boolean
): void {
  let hoveredPopulationId: string | null = null;

  // A style change discards every feature's state, so nothing is highlighted
  // any more; forgetting the id lets the next move highlight it again.
  map.on('style.load', () => {
    hoveredPopulationId = null;
  });

  map.on('mousemove', FILL_LAYER, (e) => {
    if (!isVisible()) return;

    if (e.features && e.features.length > 0) {
      map.getCanvas().style.cursor = 'pointer';

      const feature = e.features[0];
      // Still on the same barangay: it is already highlighted. This fires on
      // every pointer move, and used to clear and set the state each time.
      if (feature.id === hoveredPopulationId) return;

      if (hoveredPopulationId !== null) {
        map.setFeatureState(
          { source: SOURCE, id: hoveredPopulationId },
          { hover: false }
        );
      }
      hoveredPopulationId = feature.id as string;
      map.setFeatureState(
        { source: SOURCE, id: hoveredPopulationId },
        { hover: true }
      );
    }
  });

  map.on('mouseleave', FILL_LAYER, () => {
    if (!isVisible()) return;

    map.getCanvas().style.cursor = '';
    if (hoveredPopulationId !== null) {
      map.setFeatureState(
        { source: SOURCE, id: hoveredPopulationId },
        { hover: false }
      );
    }
    hoveredPopulationId = null;
  });

  map.on('click', FILL_LAYER, (e) => {
    if (!isVisible()) return;

    if (e.features && e.features.length > 0) {
      const feature = e.features[0];
      const props = feature.properties || {};

      // Clear previous clicked state
      if (selection.clickedId !== null) {
        map.setFeatureState(
          { source: SOURCE, id: selection.clickedId },
          { clicked: false }
        );
      }

      // Set new clicked state
      selection.clickedId = feature.id as string;
      map.setFeatureState(
        { source: SOURCE, id: selection.clickedId },
        { clicked: true }
      );

      // Remove existing popup
      if (selection.popup) {
        selection.popup.remove();
      }

      // Create popup container
      const popupContainer = document.createElement('div');
      popupContainer.style.padding = '0px';
      popupContainer.style.minWidth = '200px';
      popupContainer.style.position = 'relative';

      // Create close button
      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.setAttribute('aria-label', 'Close');
      closeButton.style.cssText = POPULATION_POPUP_CLOSE_BUTTON_CSS;
      closeButton.innerHTML = `
              <svg aria-hidden="true" width="9" height="9" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 1L1 13M1 1L13 13" stroke="#4a5565" stroke-width="2" stroke-linecap="round"/>
              </svg>
            `;
      closeButton.onmouseover = () =>
        (closeButton.style.backgroundColor = POPULATION_POPUP_CLOSE_BG_HOVER);
      closeButton.onmouseout = () =>
        (closeButton.style.backgroundColor = POPULATION_POPUP_CLOSE_BG);

      // Create content
      const content = document.createElement('div');
      content.innerHTML = `
              <h3 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 600; padding-right: 0px;">Barangay ${escapeHtml(
                props.name || 'Unknown Area'
              )}</h3>
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #666; font-size: 12px;">Population</span>
                  <span style=" font-size: 12px;">${escapeHtml(
                    props['population-count'] || 'N/A'
                  )}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #666; font-size: 12px;">Density</span>
                  <span style=" font-size: 12px;">${escapeHtml(
                    props['population-density'] || 'N/A'
                  )} per km²</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #666; font-size: 12px;">Land Area</span>
                  <span style=" font-size: 12px;">${escapeHtml(
                    props['land-area'] || 'N/A'
                  )} km²</span>
                </div>
              </div>
            `;

      popupContainer.appendChild(closeButton);
      popupContainer.appendChild(content);

      // The popup opens where the user clicked, not at the polygon's centre.
      const coordinates = e.lngLat;

      // Create and add popup without default close button
      selection.popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        maxWidth: '300px',
        className: 'population-popup',
      })
        .setLngLat(coordinates)
        .setDOMContent(popupContainer)
        .addTo(map);

      // Add click handler to close button that properly closes the popup
      closeButton.onclick = () => {
        if (selection.popup) {
          selection.popup.remove();
        }
      };
    }
  });

  // Handle clicks outside population areas to clear clicked state
  map.on('click', (e) => {
    if (!map.getLayer(FILL_LAYER)) return;

    const features = map.queryRenderedFeatures(e.point, {
      layers: [FILL_LAYER],
    });

    // If click is outside population areas, clear clicked state
    if (features.length === 0 && selection.clickedId !== null) {
      map.setFeatureState(
        { source: SOURCE, id: selection.clickedId },
        { clicked: false }
      );
      selection.clickedId = null;

      // Also remove popup if it exists
      if (selection.popup) {
        selection.popup.remove();
      }
    }
  });
}

/** Un-select the clicked barangay and close its popup: the overlay was switched off. */
export function clearPopulationSelection(
  map: mapboxgl.Map,
  selection: PopulationSelection
): void {
  if (selection.clickedId !== null) {
    map.setFeatureState(
      { source: SOURCE, id: selection.clickedId },
      { clicked: false }
    );
    selection.clickedId = null;
  }
  if (selection.popup) {
    selection.popup.remove();
    selection.popup = null;
  }
}
