import mapboxgl from 'mapbox-gl';

import {
  getCirclePaintConfig,
  getLinePaintConfig,
} from '@/lib/map/simulation-config';

/**
 * Add the sources and layers the simulation map draws.
 *
 * Called on both `load` and `style.load`: switching the basemap drops all
 * custom layers, so they are re-added. Every step checks for its source or
 * layer first, which is what makes a second call safe.
 *
 * Order matters here. The flood-propagation layers go in before the drainage
 * network so the heatmap renders beneath the pipes and nodes rather than
 * covering them.
 */
export function addSimulationLayers(map: mapboxgl.Map): void {
  if (!map.getSource('mapbox-dem')) {
    map.addSource('mapbox-dem', {
      type: 'raster-dem',
      url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
      tileSize: 512,
      maxzoom: 14,
    });
    map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
  }

  // Enable 3D buildings using Mapbox Standard style configuration
  // Standard style has built-in 3D buildings that can be configured
  try {
    if (map.setConfigProperty) {
      map.setConfigProperty('basemap', 'showBuildingExtrusions', true);
    }
  } catch (error) {
    console.warn('Could not enable 3D buildings:', error);
  }

  // Add Flood Propagation layers FIRST so they appear below drainage layers
  // Two separate layers: one for nodes, one for lines (allows independent radius/opacity control)
  if (!map.getSource('flood_propagation_nodes')) {
    const emptyGeoJSON: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [],
    };

    // Shared heatmap color gradient
    const heatmapColor = [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0,
      'rgba(0, 0, 0, 0)',
      0.15,
      'rgba(30, 144, 255, 0.7)', // Dodger blue - low density
      0.3,
      'rgba(0, 102, 204, 0.8)', // Strong blue - low-moderate
      0.5,
      'rgba(0, 71, 171, 0.85)', // Blue - moderate flood
      0.7,
      'rgba(0, 47, 167, 0.9)', // Dark blue - high flood
      0.85,
      'rgba(0, 20, 124, 0.95)', // Very dark blue - very high flood
      1,
      'rgba(0, 0, 100, 1.0)', // Navy blue - peak flood (fully opaque)
    ];

    // --- Lines Flood Propagation (added first = rendered below nodes) ---
    map.addSource('flood_propagation_lines', {
      type: 'geojson',
      data: emptyGeoJSON,
    });

    map.addLayer({
      id: 'flood_propagation-lines-layer',
      type: 'heatmap',
      source: 'flood_propagation_lines',
      layout: {
        visibility: 'visible',
      },
      paint: {
        'heatmap-weight': [
          '*',
          ['coalesce', ['get', 'pulseMultiplier'], 1],
          0.15,
        ],
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          0.2,
          12,
          0.6,
          13,
          1.2,
          15,
          2.0,
        ],
        'heatmap-color': heatmapColor as mapboxgl.ExpressionSpecification,
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          1,
          12,
          6,
          13,
          20,
          15,
          60,
        ],
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          0.05,
          7,
          0.1,
          10,
          0.2,
          12,
          0.3,
          14,
          0.45,
          16,
          0.55,
        ],
      },
    });

    // --- Nodes Flood Propagation (added second = rendered above lines) ---
    map.addSource('flood_propagation_nodes', {
      type: 'geojson',
      data: emptyGeoJSON,
    });

    map.addLayer({
      id: 'flood_propagation-nodes-layer',
      type: 'heatmap',
      source: 'flood_propagation_nodes',
      layout: {
        visibility: 'visible',
      },
      paint: {
        'heatmap-weight': [
          '*',
          ['coalesce', ['get', 'pulseMultiplier'], 1],
          // Set per point by floodHeatmapWeight, which reads both the live
          // and the stored category labels.
          ['coalesce', ['get', 'hazardWeight'], 0.2],
        ],
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          0.4,
          12,
          1.0,
          13,
          1.8,
          15,
          3.0,
        ],
        'heatmap-color': heatmapColor as mapboxgl.ExpressionSpecification,
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          3,
          12,
          12,
          13,
          35,
          15,
          80,
        ],
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0,
          0.15,
          7,
          0.2,
          10,
          0.3,
          12,
          0.4,
          14,
          0.5,
          16,
          0.6,
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
    map.addLayer({
      id: 'outlets-layer',
      type: 'circle',
      source: 'outlets',
      paint: getCirclePaintConfig('outlets'),
    });
  }
}
