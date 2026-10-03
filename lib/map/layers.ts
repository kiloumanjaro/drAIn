import mapboxgl from 'mapbox-gl';

import { escapeHtml } from '@/lib/escape-html';
import { FLOOD_PRONE_AREAS } from '@/lib/map/flood-prone-areas';
import {
  getCircleHitAreaPaintConfig,
  getCirclePaintConfig,
  getFloodHazardPaintConfig,
  getLineHitAreaPaintConfig,
  getLinePaintConfig,
} from '@/lib/map/config';

/**
 * Where a flood-hazard scenario's GeoJSON lives. The files are slimmed,
 * versioned exports (scripts/slim-flood-hazard.mjs) served with immutable
 * caching (next.config.ts), so a re-export must bump the version in both
 * places.
 */
export function floodHazardDataUrl(scenarioId: string): string {
  return `/flood-hazard/${scenarioId} Flood Hazard.v2.json`;
}

/**
 * Add every source and layer the public map draws.
 *
 * Called on both `load` and `style.load`: changing the basemap style drops
 * all custom layers, so they are re-added. Every step checks first, which is
 * what makes calling it twice safe.
 */
export function addMapLayers(
  map: mapboxgl.Map,
  { floodScenario }: { floodScenario: string }
): void {
  if (!map.getSource('mapbox-dem')) {
    map.addSource('mapbox-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14,
    });
    map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
  }

  if (!map.getLayer('3d-buildings')) {
    map.addLayer(
      {
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 15,
        paint: {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            15,
            0,
            15.05,
            ['get', 'height'],
          ],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': 0.6,
        },
      },
      'waterway-label'
    );
  }

  if (!map.getSource('flood_hazard')) {
    map.addSource('flood_hazard', {
      type: 'geojson',
      data: floodHazardDataUrl(floodScenario),
    });

    map.addLayer({
      id: 'flood_hazard-layer',
      type: 'fill',
      source: 'flood_hazard',
      paint: getFloodHazardPaintConfig(),
    });
  }

  if (!map.getSource('mandaue_population')) {
    map.addSource('mandaue_population', {
      type: 'geojson',
      data: '/additional-overlays/mandaue_population.geojson',
      promoteId: 'name',
    });

    map.addLayer({
      id: 'mandaue_population-fill',
      type: 'fill',
      source: 'mandaue_population',
      layout: {
        visibility: 'none',
      },
      paint: {
        'fill-color': '#0288d1',
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'clicked'], false],
          0.18,
          ['boolean', ['feature-state', 'hover'], false],
          0.09,
          0,
        ],
      },
    });

    map.addLayer({
      id: 'mandaue_population-layer',
      type: 'line',
      source: 'mandaue_population',
      layout: {
        visibility: 'none',
      },
      paint: {
        'line-color': '#0288d1',
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'clicked'], false],
          2,
          ['boolean', ['feature-state', 'hover'], false],
          1,
          0,
        ],
      },
    });
  }

  if (!map.getSource('man_pipes')) {
    map.addSource('man_pipes', {
      type: 'geojson',
      data: '/drainage/man_pipes.geojson',
      promoteId: 'Name',
    });
    // Add invisible hit area layer first (rendered below)
    map.addLayer({
      id: 'man_pipes-hit-layer',
      type: 'line',
      source: 'man_pipes',
      paint: getLineHitAreaPaintConfig('man_pipes'),
    });
    // Add visible layer on top
    map.addLayer({
      id: 'man_pipes-layer',
      type: 'line',
      source: 'man_pipes',
      paint: getLinePaintConfig('man_pipes'),
    });
  }

  if (!map.getSource('storm_drains')) {
    map.addSource('storm_drains', {
      type: 'geojson',
      data: '/drainage/storm_drains.geojson',
      promoteId: 'In_Name',
    });
    // Add invisible hit area layer first (rendered below)
    map.addLayer({
      id: 'storm_drains-hit-layer',
      type: 'circle',
      source: 'storm_drains',
      paint: getCircleHitAreaPaintConfig('storm_drains'),
    });
    // Add visible layer on top
    map.addLayer({
      id: 'storm_drains-layer',
      type: 'circle',
      source: 'storm_drains',
      paint: getCirclePaintConfig('storm_drains'),
    });
  }

  if (!map.getSource('inlets')) {
    map.addSource('inlets', {
      type: 'geojson',
      data: '/drainage/inlets.geojson',
      promoteId: 'In_Name',
    });
    // Add invisible hit area layer first (rendered below)
    map.addLayer({
      id: 'inlets-hit-layer',
      type: 'circle',
      source: 'inlets',
      paint: getCircleHitAreaPaintConfig('inlets'),
    });
    // Add visible layer on top
    map.addLayer({
      id: 'inlets-layer',
      type: 'circle',
      source: 'inlets',
      paint: getCirclePaintConfig('inlets'),
    });
  }

  if (!map.getSource('outlets')) {
    map.addSource('outlets', {
      type: 'geojson',
      data: '/drainage/outlets.geojson',
      promoteId: 'Out_Name',
    });
    // Add invisible hit area layer first (rendered below)
    map.addLayer({
      id: 'outlets-hit-layer',
      type: 'circle',
      source: 'outlets',
      paint: getCircleHitAreaPaintConfig('outlets'),
    });
    // Add visible layer on top
    map.addLayer({
      id: 'outlets-layer',
      type: 'circle',
      source: 'outlets',
      paint: getCirclePaintConfig('outlets'),
    });
  }

  // Add flood prone areas
  const floodProneAreas = FLOOD_PRONE_AREAS;

  floodProneAreas.forEach((area) => {
    if (!map.getSource(area.id)) {
      map.addSource(area.id, {
        type: 'geojson',
        data: `/additional-overlays/flood-prone-area/${area.file}`,
      });

      map.addLayer({
        id: `${area.id}-layer`,
        type: 'circle',
        source: area.id,
        layout: {
          visibility: 'none',
        },
        paint: {
          'circle-radius': 8,
          'circle-color': area.color,
          'circle-opacity': 1,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
    }
  });

  // Add hover handlers for flood prone areas
  const floodPronePopupRef = { current: null as mapboxgl.Popup | null };

  floodProneAreas.forEach((area) => {
    map.on('mouseenter', `${area.id}-layer`, (e) => {
      map.getCanvas().style.cursor = 'pointer';

      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const props = feature.properties || {};

        // Remove existing popup if any
        if (floodPronePopupRef.current) {
          floodPronePopupRef.current.remove();
        }

        // Get feature coordinates (center of the circle)
        const coordinates = (
          feature.geometry as { coordinates: number[] }
        ).coordinates.slice() as [number, number];

        // Ensure coordinates don't get wrapped around the globe
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        // Create popup container
        const popupContainer = document.createElement('div');
        popupContainer.style.padding = '8px 10px';
        popupContainer.style.whiteSpace = 'nowrap';

        // Create content
        const content = document.createElement('div');
        content.innerHTML = `
          <h3 style="margin: 0; font-size: 12px; font-weight: 600;">
            ${escapeHtml(props.Name || 'Flood Prone Area')}
          </h3>
        `;

        popupContainer.appendChild(content);

        // Create popup positioned above the circle
        floodPronePopupRef.current = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          anchor: 'bottom',
          offset: 25,
        })
          .setLngLat(coordinates)
          .setDOMContent(popupContainer)
          .addTo(map);
      }
    });

    map.on('mouseleave', `${area.id}-layer`, () => {
      map.getCanvas().style.cursor = '';
      if (floodPronePopupRef.current) {
        floodPronePopupRef.current.remove();
        floodPronePopupRef.current = null;
      }
    });
  });
}
