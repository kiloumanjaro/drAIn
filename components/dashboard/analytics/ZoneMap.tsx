'use client';

import { Skeleton } from '@/components/ui/skeleton';
import {
  loadMandaueGeoJSON,
  type GeoJSONFeatureCollection,
  createHeatmapPoints,
  createHeatmapFromReports,
} from '@/lib/dashboard/geojson';
import type {
  ZoneIssueData,
  ReportWithMetadata,
} from '@/lib/dashboard/queries';
import { AlertCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

interface ZoneMapProps {
  data: ZoneIssueData[];
  reports?: ReportWithMetadata[]; // Optional: use actual report coordinates
  loading?: boolean;
}

export default function ZoneMap({
  data,
  reports,
  loading = false,
}: ZoneMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [geoJsonData, setGeoJsonData] =
    useState<GeoJSONFeatureCollection | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  // Load GeoJSON on mount
  useEffect(() => {
    const loadGeoJson = async () => {
      const data = await loadMandaueGeoJSON();
      setGeoJsonData(data);
    };
    loadGeoJson();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN) {
      if (!MAPBOX_TOKEN) {
        setMapError('Mapbox token not configured');
      }
      return;
    }

    if (!geoJsonData) return;
    if (map.current) return; // Prevent re-initialization

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [123.93, 10.33],
        zoom: 13,
        pitch: 0,
        scrollZoom: false,
        dragPan: true,
        dragRotate: false,
        doubleClickZoom: false,
        touchZoomRotate: false,
        attributionControl: false,
        maxBounds: [
          [123.91, 10.32],
          [123.95, 10.36],
        ],
      });

      map.current.on('load', () => {
        if (!map.current) return;

        // Add GeoJSON source for barangay boundaries
        map.current.addSource('barangay-source', {
          type: 'geojson',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: geoJsonData as any,
          generateId: true,
        });

        // Use actual report coordinates if available, otherwise use aggregated barangay counts
        const heatmapPoints =
          reports && reports.length > 0
            ? createHeatmapFromReports(reports)
            : createHeatmapPoints(geoJsonData.features, data);

        // For report-based heatmap, each point represents one report (weight = 1)
        // For barangay-based heatmap, calculate percentage-based weights
        if (!reports || reports.length === 0) {
          const totalIssues = data.reduce((sum, z) => sum + z.count, 0);
          const maxCount = Math.max(...data.map((z) => z.count), 1);

          heatmapPoints.features.forEach((feature) => {
            if (!feature.properties) return;
            const issueCount = feature.properties.issueCount || 0;
            const percentage =
              totalIssues > 0 ? (issueCount / totalIssues) * 100 : 0;
            feature.properties.percentage = Math.round(percentage * 10) / 10;
            feature.properties.normalizedWeight = issueCount / maxCount;
          });
        } else {
          // For report-based heatmap, each point has equal weight
          heatmapPoints.features.forEach((feature) => {
            if (!feature.properties) return;
            feature.properties.percentage = 1; // Each report contributes equally
            feature.properties.normalizedWeight = 1;
          });
        }

        // Add heatmap source
        map.current.addSource('heatmap-source', {
          type: 'geojson',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: heatmapPoints as any,
        });

        // Add heatmap layer (official Mapbox approach)
        map.current.addLayer(
          {
            id: 'issues-heatmap',
            type: 'heatmap',
            source: 'heatmap-source',
            maxzoom: 15,
            paint: {
              // Weight: For report-based (each = 1), use constant. For barangay-based, use percentage
              'heatmap-weight':
                reports && reports.length > 0
                  ? 1 // Each report point has equal weight
                  : [
                      'interpolate',
                      ['linear'],
                      ['get', 'percentage'],
                      0,
                      0,
                      2,
                      0.5,
                      5,
                      0.7,
                      10,
                      0.9,
                      15,
                      1,
                      100,
                      1.5,
                    ],
              // Lower intensity for more organic, wobbly shapes
              'heatmap-intensity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0,
                0.8,
                13,
                2,
                15,
                3,
              ],
              // Refined color gradient: red appears earlier for tighter hotspots
              'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0,
                'rgba(0, 0, 0, 0)',
                0.15,
                'rgba(65, 105, 225, 0.7)', // Blue - low density
                0.35,
                'rgba(0, 191, 255, 0.85)', // Cyan - moderate
                0.55,
                'rgba(255, 255, 0, 0.9)', // Yellow - higher
                0.7,
                'rgba(255, 140, 0, 0.95)', // Orange - concentrated
                0.85,
                'rgba(255, 69, 0, 1)', // Red-orange - very concentrated
                1,
                'rgba(220, 20, 60, 1)', // Deep red - peak
              ],
              // Larger, more varied radius for organic, wobbly shapes
              'heatmap-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0,
                25,
                12,
                60,
                13,
                90,
                15,
                120,
              ],
              // Keep opacity high until very high zoom
              'heatmap-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                7,
                1,
                14,
                0.8,
                15,
                0,
              ],
            },
          },
          'waterway-label'
        );

        // Add circle layer for individual points at high zoom
        map.current.addLayer(
          {
            id: 'issues-circle',
            type: 'circle',
            source: 'heatmap-source',
            minzoom: 14,
            paint: {
              // Size circle radius by percentage for consistency
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                14,
                [
                  'interpolate',
                  ['linear'],
                  ['get', 'percentage'],
                  0,
                  3,
                  10,
                  15,
                  30,
                  30,
                ],
                16,
                [
                  'interpolate',
                  ['linear'],
                  ['get', 'percentage'],
                  0,
                  8,
                  10,
                  25,
                  30,
                  40,
                ],
              ],
              // Vibrant colors matching heatmap palette
              'circle-color': [
                'interpolate',
                ['linear'],
                ['get', 'percentage'],
                0,
                'rgba(65, 105, 225, 0.9)',
                5,
                'rgba(0, 191, 255, 0.95)',
                10,
                'rgba(255, 255, 0, 0.95)',
                15,
                'rgba(255, 140, 0, 1)',
                20,
                'rgba(255, 69, 0, 1)',
                30,
                'rgba(220, 20, 60, 1)',
              ],
              'circle-stroke-color': 'white',
              'circle-stroke-width': 2,
              // Transition from heatmap to circle layer
              'circle-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                7,
                0,
                15,
                1,
              ],
            },
          },
          'waterway-label'
        );

        // Add outline layer - only visible when zone is selected
        map.current.addLayer({
          id: 'barangay-outline',
          type: 'line',
          source: 'barangay-source',
          paint: {
            'line-color': '#3b82f6',
            'line-width': 2.5,
            'line-opacity': 0, // Hidden by default
          },
        });

        // Add labels for barangay names
        map.current.addLayer({
          id: 'barangay-labels',
          type: 'symbol',
          source: 'heatmap-source',
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 11,
            'text-anchor': 'center',
            'text-offset': [0, 0],
          },
          paint: {
            'text-color': '#1f2937',
            'text-halo-color': '#ffffff',
            'text-halo-width': 2,
            'text-halo-blur': 1,
          },
        });

        // Click handler for heatmap circles
        map.current.on('click', 'issues-circle', (e) => {
          if (e.features && e.features[0]) {
            const clickedName = e.features[0].properties?.name;
            const matchedZone = data.find(
              (z) => z.zone.toLowerCase() === clickedName?.toLowerCase()
            );
            if (matchedZone) {
              setSelectedZone((prev) =>
                matchedZone.zone === prev ? null : matchedZone.zone
              );
            }
          }
        });

        // Click handler for heatmap layer (at lower zoom levels)
        map.current.on('click', 'issues-heatmap', (e) => {
          if (e.features && e.features[0]) {
            const clickedName = e.features[0].properties?.name;
            const matchedZone = data.find(
              (z) => z.zone.toLowerCase() === clickedName?.toLowerCase()
            );
            if (matchedZone) {
              setSelectedZone((prev) =>
                matchedZone.zone === prev ? null : matchedZone.zone
              );
            }
          }
        });

        // Change cursor on hover
        map.current.on('mouseenter', 'issues-circle', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseleave', 'issues-circle', () => {
          if (map.current) map.current.getCanvas().style.cursor = '';
        });
        map.current.on('mouseenter', 'issues-heatmap', () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseleave', 'issues-heatmap', () => {
          if (map.current) map.current.getCanvas().style.cursor = '';
        });
      });
    } catch (error) {
      console.error('Map error:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setMapError(`Failed to initialize map: ${errorMessage}`);
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [geoJsonData, data, reports]);

  // Update outline visibility when selectedZone changes
  useEffect(() => {
    if (!map.current || !geoJsonData) return;

    // Check if map is loaded and layer exists before updating
    if (
      !map.current.isStyleLoaded() ||
      !map.current.getLayer('barangay-outline')
    ) {
      return;
    }

    // Show outline only for selected zone
    map.current.setPaintProperty('barangay-outline', 'line-opacity', [
      'case',
      ['==', ['get', 'name'], selectedZone || ''],
      1,
      0,
    ]);
  }, [selectedZone, geoJsonData]);

  // Loading state
  if (loading) {
    return (
      <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-6">
        <div className="md:col-span-4">
          <Skeleton className="h-[28rem] w-full rounded-lg md:h-[36rem]" />
        </div>
        <div className="h-[28rem] space-y-3 md:col-span-2 md:h-[36rem]">
          <Skeleton className="h-12 w-full rounded-lg" />
          <div className="flex-1 space-y-3 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-6">
        <div className="md:col-span-4">
          <div className="flex h-[28rem] items-center justify-center rounded-lg border border-yellow-200 bg-yellow-50 md:h-[36rem]">
            <div className="text-center">
              <AlertCircle className="mx-auto mb-2 h-12 w-12 text-yellow-600" />
              <p className="font-medium text-yellow-800">
                No zone data available
              </p>
            </div>
          </div>
        </div>
        <aside className="flex h-[28rem] flex-col md:col-span-2 md:h-[36rem]">
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="text-sm text-gray-600">No zones to display</p>
          </div>
        </aside>
      </div>
    );
  }

  // Sort by count descending
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  const totalIssues = sortedData.reduce((sum, z) => sum + z.count, 0) || 0;

  // City information
  const cityName = 'Mandaue City, Philippines';
  // const landArea = '34.87 km²';

  // Helper function to get contribution box colors
  const getContributionColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-red-600';
    if (percentage >= 30) return 'bg-blue-500';
    return 'bg-green-500';
  };

  // Helper function to create contribution boxes (like GitHub commits)
  const renderContributionBoxes = (percentage: number) => {
    const boxCount = 20; // Number of boxes in the bar
    const filledBoxes = Math.round((percentage / 100) * boxCount);

    return (
      <div className="flex w-full gap-1">
        {Array.from({ length: boxCount }).map((_, index) => (
          <div
            key={index}
            className={`aspect-square flex-1 border ${
              index < filledBoxes
                ? `${getContributionColor(percentage)} border-transparent`
                : 'border-gray-300 bg-gray-200'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-6">
        {/* Map: left 4/6 */}
        <div className="md:col-span-4">
          {mapError ? (
            <div className="flex h-[28rem] items-center justify-center rounded-lg border border-red-200 bg-red-50 md:h-[36rem]">
              <div className="text-center">
                <AlertCircle className="mx-auto mb-2 h-12 w-12 text-red-600" />
                <p className="font-medium text-red-800">{mapError}</p>
                <p className="mt-1 text-sm text-red-600">
                  Please configure Mapbox token to enable map visualization
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-[#dfdfdf] p-1">
              <div
                ref={mapContainer}
                className="h-[28rem] overflow-hidden rounded-md border border-[#dfdfdf] bg-white md:h-[36rem]"
              />
            </div>
          )}
        </div>

        {/* Barangays: right 2/6 */}
        <aside className="flex h-[28rem] flex-col md:col-span-2 md:h-[36rem]">
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 rounded-t-lg border border-[#dddbdc] bg-[#f9f7f8] px-5 py-3">
            {/* City Info and Total Issues in same row */}
            <div className="flex items-start justify-between gap-3">
              {/* City Info */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-row justify-between">
                  <h3 className="truncate text-sm text-gray-900">{cityName}</h3>
                  <p className="text-muted-foreground text-sm">{totalIssues}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Zone List */}
          <div className="flex-1 overflow-auto rounded-b-lg border-x border-b bg-white px-4 pt-3 pb-5">
            <ul className="space-y-2">
              {sortedData.slice(0, 12).map((zone) => {
                const percentage = totalIssues
                  ? (zone.count / totalIssues) * 100
                  : 0;
                const isSelected = zone.zone === selectedZone;
                return (
                  <li key={zone.zone}>
                    <button
                      onClick={() =>
                        setSelectedZone(
                          zone.zone === selectedZone ? null : zone.zone
                        )
                      }
                      className={`flex w-full flex-col gap-2.5 rounded-md px-4 pt-2 pb-4 text-left transition-colors hover:bg-gray-100 ${
                        isSelected ? 'ring-1 ring-blue-500' : ''
                      }`}
                    >
                      <div className="flex min-w-0 items-center justify-between">
                        <span className="truncate text-sm font-medium">
                          {zone.zone}
                        </span>
                        <span className="ml-2 flex-shrink-0 text-xs font-semibold text-gray-700">
                          {zone.count}
                        </span>
                      </div>
                      <div className="w-full">
                        {renderContributionBoxes(percentage)}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
