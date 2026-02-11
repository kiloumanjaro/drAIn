/* eslint-disable */

'use client';

import { ControlPanel } from '@/components/control-panel';
import { CameraControls } from '@/components/camera-controls';
import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MAP_BOUNDS,
  MAPBOX_ACCESS_TOKEN,
} from '@/lib/map/config';

import {
  runSimulation,
  transformToNodeDetails,
} from '@/lib/simulation-api/simulation';
import { enableRain, disableRain } from '@/lib/map/effects/rain-utils';
import { enableFlood3D } from '@/lib/map/effects/flood-3d-utils';

import {
  SIMULATION_MAP_STYLE,
  SIMULATION_PITCH,
  SIMULATION_BEARING,
  SIMULATION_LAYER_IDS,
  LAYER_COLORS,
  CAMERA_ANIMATION,
  getLinePaintConfig,
  getCirclePaintConfig,
} from '@/lib/map/simulation-config';
import mapboxgl from 'mapbox-gl';
import { useInlets } from '@/hooks/useInlets';
import { useOutlets } from '@/hooks/useOutlets';
import { useDrain } from '@/hooks/useDrain';
import { usePipes } from '@/hooks/usePipes';
import type {
  DatasetType,
  Inlet,
  Outlet,
  Drain,
  Pipe,
} from '@/components/control-panel/types';

import 'mapbox-gl/dist/mapbox-gl.css';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { toast } from 'sonner';
import { VulnerabilityDataTable } from '@/components/vulnerability-data-table';
import { fetchYRTable } from '@/lib/Vulnerabilities/FetchDeets';
import { NodeSimulationSlideshow } from '@/components/node-simulation-slideshow';
import { NodeParametersPanel } from '@/components/node-parameters-panel';
import { LinkParametersPanel } from '@/components/link-parameters-panel';
import { Minimize } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

type YearOption = 2 | 5 | 10 | 15 | 20 | 25 | 50 | 100;

interface NodeDetails {
  Node_ID: string;
  Vulnerability_Category: string;
  Vulnerability_Rank: number;
  Cluster: number;
  Cluster_Score: number;
  YR: number;
  Time_Before_Overflow: number;
  Hours_Flooded: number;
  Maximum_Rate: number;
  Time_Of_Max_Occurence: number;
  Total_Flood_Volume: number;
}

interface RainfallParams {
  total_precip: number;
  duration_hr: number;
}

// Use default rainfall params or get from somewhere
const rainfallVal = {
  total_precip: 140,
  duration_hr: 1,
};

export default function SimulationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSimulationActive = searchParams.get('active') === 'true';
  const { setOpen, isMobile, setOpenMobile, open } = useSidebar();

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const [selectedFloodScenario, setSelectedFloodScenario] =
    useState<string>('5YR');

  const [overlayVisibility, setOverlayVisibility] = useState({
    'man_pipes-layer': true,
    'storm_drains-layer': true,
    'inlets-layer': true,
    'outlets-layer': true,
  });

  const [selectedFeature, setSelectedFeature] = useState<{
    id: string | number;
    source: string;
    layer: string;
  } | null>(null);

  const selectedFeatureRef = useRef<{
    id: string | number;
    source: string;
    layer: string;
  } | null>(null);

  const layerIds = useMemo(() => SIMULATION_LAYER_IDS, []);

  // Load data from hooks
  const { inlets } = useInlets();
  const { outlets } = useOutlets();
  const { pipes } = usePipes();
  const { drains } = useDrain();

  // Selection state for control panel detail view
  const [selectedInlet, setSelectedInlet] = useState<Inlet | null>(null);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [selectedPipe, setSelectedPipe] = useState<Pipe | null>(null);
  const [selectedDrain, setSelectedDrain] = useState<Drain | null>(null);

  // Control panel state
  const [controlPanelTab, setControlPanelTab] = useState<string>('simulations');
  const [controlPanelDataset, setControlPanelDataset] =
    useState<DatasetType>('inlets');
  const [selectedPointForSimulation, setSelectedPointForSimulation] = useState<
    string | null
  >(null);

  // Vulnerability table state (Model 1)
  const [selectedYear, setSelectedYear] = useState<YearOption | null>(null);
  const [tableData, setTableData] = useState<NodeDetails[] | null>(null);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [isTableMinimized, setIsTableMinimized] = useState(false);
  const [tablePosition, setTablePosition] = useState<{ x: number; y: number }>({
    x: typeof window !== 'undefined' ? window.innerWidth * 0.6 - 250 : 400,
    y: typeof window !== 'undefined' ? window.innerHeight * 0.5 - 300 : 100,
  });
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(
    new Set()
  );
  const [vulnerabilityMap, setVulnerabilityMap] = useState<Map<string, string>>(
    new Map()
  );

  // model 1 table state
  const [tableData3, setTableData3] = useState<NodeDetails[] | null>(null);
  const [isLoadingTable3, setIsLoadingTable3] = useState(false);
  const [isTable3Minimized, setIsTable3Minimized] = useState(false);
  const [table3Position, setTable3Position] = useState<{
    x: number;
    y: number;
  }>({
    x: typeof window !== 'undefined' ? window.innerWidth * 0.6 - 250 : 400,
    y: typeof window !== 'undefined' ? window.innerHeight * 0.5 - 300 : 100,
  });

  // Slideshow state
  const [slideshowNode, setSlideshowNode] = useState<string | null>(null);
  const [slideshowNodeData, setSlideshowNodeData] =
    useState<NodeDetails | null>(null);
  const [slideshowAllData, setSlideshowAllData] = useState<
    NodeDetails[] | null
  >(null);

  // Model3 lifted state for parameters panels
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>(
    []
  );
  const [selectedPipeIds, setSelectedPipeIds] = useState<string[]>([]);
  const [componentParams, setComponentParams] = useState<Map<string, any>>(
    new Map()
  );
  const [pipeParams, setPipeParams] = useState<Map<string, any>>(new Map());
  const [rainfallParams, setRainfallParams] =
    useState<RainfallParams>(rainfallVal);

  // Rain effect state
  const [isRainActive, setIsRainActive] = useState(false); // Start with false, will be set when table is generated
  const [isFloodScenarioLoading, setIsFloodScenarioLoading] = useState(false);
  const [isFlood3DActive, setIsFlood3DActive] = useState(false);
  const [isFloodPropagationActive, setIsFloodPropagationActive] =
    useState(true); // Enabled by default
  const [isFloodPropagationAnimating, setIsFloodPropagationAnimating] =
    useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const nodeFloodPropagationFeaturesRef = useRef<GeoJSON.Feature[]>([]);
  const lineFloodPropagationFeaturesRef = useRef<GeoJSON.Feature[]>([]);
  const lastAnimationTimeRef = useRef<number>(0);
  const shouldAnimateFloodPropagationRef = useRef<boolean>(true);

  // Panel visibility - mutual exclusivity
  const [activePanel, setActivePanel] = useState<'node' | 'link' | null>(null);

  // Panel positions (persisted in localStorage)
  const [nodePanelPosition, setNodePanelPosition] = useState<{
    x: number;
    y: number;
  }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nodePanelPosition');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved node panel position', e);
        }
      }
      return {
        x: window.innerWidth * 0.5 - 250,
        y: window.innerHeight * 0.5 - 300,
      };
    }
    return { x: 400, y: 100 };
  });

  const [linkPanelPosition, setLinkPanelPosition] = useState<{
    x: number;
    y: number;
  }>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('linkPanelPosition');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved link panel position', e);
        }
      }
      return {
        x: window.innerWidth * 0.5 - 250,
        y: window.innerHeight * 0.5 - 300,
      };
    }
    return { x: 400, y: 100 };
  });

  // Function to clear all selections
  const clearSelections = () => {
    setSelectedInlet(null);
    setSelectedOutlet(null);
    setSelectedPipe(null);
    setSelectedDrain(null);

    // Also clear the map's feature state if something was selected
    if (selectedFeatureRef.current && mapRef.current) {
      mapRef.current.setFeatureState(
        {
          source: selectedFeatureRef.current.source,
          id: selectedFeatureRef.current.id,
        },
        { selected: false }
      );
      setSelectedFeature(null);
    }
    // NOTE: We intentionally do NOT disable flood propagation here
    // to preserve the visualization when navigating back
  };

  // Refs for data to avoid stale closures in map click handler
  const inletsRef = useRef<Inlet[]>([]);
  const outletsRef = useRef<Outlet[]>([]);
  const pipesRef = useRef<Pipe[]>([]);
  const drainsRef = useRef<Drain[]>([]);

  // Update refs when data changes
  useEffect(() => {
    inletsRef.current = inlets;
  }, [inlets]);

  useEffect(() => {
    outletsRef.current = outlets;
  }, [outlets]);

  useEffect(() => {
    pipesRef.current = pipes;
  }, [pipes]);

  useEffect(() => {
    drainsRef.current = drains;
  }, [drains]);

  // Sync ref with state to avoid stale closures
  useEffect(() => {
    selectedFeatureRef.current = selectedFeature;
  }, [selectedFeature]);

  // Save panel positions to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'nodePanelPosition',
        JSON.stringify(nodePanelPosition)
      );
    }
  }, [nodePanelPosition]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'linkPanelPosition',
        JSON.stringify(linkPanelPosition)
      );
    }
  }, [linkPanelPosition]);

  // Auto-open node panel when components selected
  useEffect(() => {
    if (selectedComponentIds.length > 0 && activePanel !== 'node') {
      setActivePanel('node');
    } else if (selectedComponentIds.length === 0 && activePanel === 'node') {
      setActivePanel(null);
    }
  }, [selectedComponentIds.length]);

  // Auto-open link panel when pipes selected
  useEffect(() => {
    if (selectedPipeIds.length > 0 && activePanel !== 'link') {
      setActivePanel('link');
    } else if (selectedPipeIds.length === 0 && activePanel === 'link') {
      setActivePanel(null);
    }
  }, [selectedPipeIds.length]);

  // Auto-close sidebar when simulation page loads (only once on mount)
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    // Only initialize map after sidebar is closed to ensure proper sizing
    if (mapContainerRef.current && !mapRef.current && !open) {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: SIMULATION_MAP_STYLE,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        maxBounds: MAP_BOUNDS,
        pitch: SIMULATION_PITCH,
        bearing: SIMULATION_BEARING,
        attributionControl: false,
      });
      mapRef.current = map;

      const addCustomLayers = () => {
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
          console.log(
            '[Flood Propagation] Creating Flood Propagation layers...'
          );
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
              'heatmap-color': heatmapColor as any,
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
                [
                  'case',
                  ['==', ['get', 'vulnerability'], 'High Risk'],
                  5.0,
                  ['==', ['get', 'vulnerability'], 'Medium Risk'],
                  1.5,
                  ['==', ['get', 'vulnerability'], 'Low Risk'],
                  0.6,
                  0.2,
                ],
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
              'heatmap-color': heatmapColor as any,
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
          console.log(
            '[Flood Propagation] Flood Propagation layers created successfully (nodes + lines)'
          );
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
      };

      map.on('load', addCustomLayers);
      map.on('style.load', addCustomLayers);

      // Click handlers
      map.on('click', (e) => {
        if (!isSimulationActive) return;

        const validLayers = [
          'inlets-layer',
          'outlets-layer',
          'storm_drains-layer',
          'man_pipes-layer',
        ].filter((id) => map.getLayer(id));

        if (!validLayers.length) return;

        const features = map.queryRenderedFeatures(e.point, {
          layers: validLayers,
        });

        if (!features.length) {
          clearSelections();
          setControlPanelTab('simulations');
          return;
        }

        const feature = features[0];
        const props = feature.properties || {};
        if (!feature.layer) return;

        switch (feature.layer.id) {
          case 'man_pipes-layer': {
            const pipe = pipesRef.current.find((p) => p.id === props.Name);
            if (pipe) handleSelectPipe(pipe);
            break;
          }
          case 'inlets-layer': {
            const inlet = inletsRef.current.find((i) => i.id === props.In_Name);
            if (inlet) handleSelectInlet(inlet);
            break;
          }
          case 'outlets-layer': {
            const outlet = outletsRef.current.find(
              (o) => o.id === props.Out_Name
            );
            if (outlet) handleSelectOutlet(outlet);
            break;
          }
          case 'storm_drains-layer': {
            const drain = drainsRef.current.find((d) => d.id === props.In_Name);
            if (drain) handleSelectDrain(drain);
            break;
          }
        }
      });

      // Cursor style
      layerIds.forEach((layerId) => {
        map.on('mouseenter', layerId, () => {
          if (isSimulationActive) {
            map.getCanvas().style.cursor = 'pointer';
          }
        });
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = '';
        });
      });
    }
  }, [layerIds, isSimulationActive, open]);

  useEffect(() => {
    if (mapRef.current) {
      layerIds.forEach((layerId) => {
        if (mapRef.current?.getLayer(layerId)) {
          mapRef.current.setLayoutProperty(
            layerId,
            'visibility',
            overlayVisibility[layerId as keyof typeof overlayVisibility]
              ? 'visible'
              : 'none'
          );
        }
      });
    }
  }, [overlayVisibility, layerIds]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleResetPosition = () =>
    mapRef.current?.flyTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });

  const handleChangeStyle = () => {
    // Keep dark style in simulation mode
    return;
  };

  const handleOverlayToggle = (layerId: string) => {
    const isVisible =
      !overlayVisibility[layerId as keyof typeof overlayVisibility];
    setOverlayVisibility((prev) => ({
      ...prev,
      [layerId]: !prev[layerId as keyof typeof prev],
    }));

    if (layerId === 'flood_hazard-layer') {
      if (isVisible) {
        // If flood hazard layer is being turned ON
        setIsFloodScenarioLoading(true);
        // Simulate a loading delay
        setTimeout(() => {
          setIsFloodScenarioLoading(false);
        }, 1500); // 1.5 seconds delay
      }
    }
  };

  const overlayData = [
    {
      id: 'man_pipes-layer',
      name: 'Pipes',
      color: LAYER_COLORS.man_pipes.color,
      visible: overlayVisibility['man_pipes-layer'],
    },
    {
      id: 'storm_drains-layer',
      name: 'Storm Drains',
      color: LAYER_COLORS.storm_drains.color,
      visible: overlayVisibility['storm_drains-layer'],
    },
    {
      id: 'inlets-layer',
      name: 'Inlets',
      color: LAYER_COLORS.inlets.color,
      visible: overlayVisibility['inlets-layer'],
    },
    {
      id: 'outlets-layer',
      name: 'Outlets',
      color: LAYER_COLORS.outlets.color,
      visible: overlayVisibility['outlets-layer'],
    },
  ];

  const handleToggleAllOverlays = () => {
    const someVisible = Object.values(overlayVisibility).some(Boolean);

    const updated: typeof overlayVisibility = {
      'man_pipes-layer': !someVisible,
      'storm_drains-layer': !someVisible,
      'inlets-layer': !someVisible,
      'outlets-layer': !someVisible,
    };

    setOverlayVisibility(updated);
  };

  const someVisible = Object.values(overlayVisibility).some(Boolean);

  // Panel toggle handlers
  const handleToggleNodePanel = () => {
    if (activePanel === 'node') {
      setActivePanel(null); // Close
    } else {
      setActivePanel('node'); // Open and close link panel
    }
  };

  const handleToggleLinkPanel = () => {
    if (activePanel === 'link') {
      setActivePanel(null); // Close
    } else {
      setActivePanel('link'); // Open and close node panel
    }
  };

  // Update param handlers
  const updateComponentParam = (id: string, key: string, value: number) => {
    const newParams = new Map(componentParams);
    const current = newParams.get(id) || {};
    newParams.set(id, { ...current, [key]: value });
    setComponentParams(newParams);
  };

  const updatePipeParam = (id: string, key: string, value: number) => {
    const newParams = new Map(pipeParams);
    const current = newParams.get(id) || {};
    newParams.set(id, { ...current, [key]: value });
    setPipeParams(newParams);
  };

  // Handler for the back button in control panel
  const handleControlPanelBack = () => {
    clearSelections();
    setControlPanelTab('simulations');

    // Preserve flood propagation visibility when navigating back
    // This ensures the visualization remains visible after clearing selections
    if (mapRef.current && isFloodPropagationActive) {
      const nodesLayer = mapRef.current.getLayer('flood_propagation-nodes-layer');
      const linesLayer = mapRef.current.getLayer('flood_propagation-lines-layer');

      if (nodesLayer) {
        mapRef.current.setLayoutProperty(
          'flood_propagation-nodes-layer',
          'visibility',
          'visible'
        );
      }
      if (linesLayer) {
        mapRef.current.setLayoutProperty(
          'flood_propagation-lines-layer',
          'visibility',
          'visible'
        );
      }
    }
  };

  const handleSelectInlet = (inlet: Inlet) => {
    if (!mapRef.current) return;
    const [lng, lat] = inlet.coordinates;

    // Clear any previous selections first
    clearSelections();

    // Set the new selection state for control panel
    setSelectedInlet(inlet);
    setControlPanelTab('simulations'); // Switch to simulations tab
    setControlPanelDataset('inlets');
    setSelectedPointForSimulation(inlet.id); // Pass to simulations content

    // Set new map feature state
    mapRef.current.setFeatureState(
      { source: 'inlets', id: inlet.id },
      { selected: true }
    );
    setSelectedFeature({
      id: inlet.id,
      source: 'inlets',
      layer: 'inlets-layer',
    });

    // Fly to the selected feature with smooth animation
    mapRef.current.flyTo({
      center: [lng, lat],
      zoom: CAMERA_ANIMATION.targetZoom,
      speed: CAMERA_ANIMATION.speed,
      curve: CAMERA_ANIMATION.curve,
      essential: CAMERA_ANIMATION.essential,
      easing: CAMERA_ANIMATION.easing,
    });

    // Show toast notification
    toast.info(
      <div>
        Outlet distance updated. Go{' '}
        <button
          className="cursor-pointer border-none bg-transparent p-0 underline hover:text-[#5a525a]"
          onClick={() => {
            setControlPanelTab('stats');
          }}
        >
          here
        </button>{' '}
        to view more details
      </div>
    );
  };

  const handleSelectOutlet = (outlet: Outlet) => {
    if (!mapRef.current) return;
    const [lng, lat] = outlet.coordinates;

    // Clear any previous selections first
    clearSelections();

    // Set the new selection state for control panel
    setSelectedOutlet(outlet);
    // DON'T change tab - stay on current tab
    setControlPanelDataset('outlets');

    // Set new map feature state
    mapRef.current.setFeatureState(
      { source: 'outlets', id: outlet.id },
      { selected: true }
    );
    setSelectedFeature({
      id: outlet.id,
      source: 'outlets',
      layer: 'outlets-layer',
    });

    // Fly to the selected feature with smooth animation
    mapRef.current.flyTo({
      center: [lng, lat],
      zoom: CAMERA_ANIMATION.targetZoom,
      speed: CAMERA_ANIMATION.speed,
      curve: CAMERA_ANIMATION.curve,
      essential: CAMERA_ANIMATION.essential,
      easing: CAMERA_ANIMATION.easing,
    });

    // Show toast notification
    toast.info(
      <div>
        <strong>{outlet.id}</strong> is selected. Go{' '}
        <button
          className="cursor-pointer border-none bg-transparent p-0 underline hover:text-[#5a525a]"
          onClick={() => {
            setControlPanelTab('stats');
          }}
        >
          here
        </button>{' '}
        to view details
      </div>
    );
  };

  const handleSelectDrain = (drain: Drain) => {
    if (!mapRef.current) return;
    const [lng, lat] = drain.coordinates;

    // Clear any previous selections first
    clearSelections();

    // Set the new selection state for control panel
    setSelectedDrain(drain);
    setControlPanelTab('simulations'); // Switch to simulations tab
    setControlPanelDataset('storm_drains');
    setSelectedPointForSimulation(drain.id); // Pass to simulations content

    // Set new map feature state
    mapRef.current.setFeatureState(
      { source: 'storm_drains', id: drain.id },
      { selected: true }
    );
    setSelectedFeature({
      id: drain.id,
      source: 'storm_drains',
      layer: 'storm_drains-layer',
    });

    // Fly to the selected feature with smooth animation
    mapRef.current.flyTo({
      center: [lng, lat],
      zoom: CAMERA_ANIMATION.targetZoom,
      speed: CAMERA_ANIMATION.speed,
      curve: CAMERA_ANIMATION.curve,
      essential: CAMERA_ANIMATION.essential,
      easing: CAMERA_ANIMATION.easing,
    });

    // Show toast notification
    toast.info(
      <div>
        Outlet distance updated. Go{' '}
        <button
          className="cursor-pointer border-none bg-transparent p-0 underline hover:text-[#5a525a]"
          onClick={() => {
            setControlPanelTab('stats');
          }}
        >
          here
        </button>{' '}
        for more details
      </div>
    );
  };

  const handleSelectPipe = (pipe: Pipe) => {
    if (!mapRef.current) return;
    if (!pipe.coordinates || pipe.coordinates.length === 0) return;

    // Clear any previous selections first
    clearSelections();

    // Set the new selection state for control panel
    setSelectedPipe(pipe);
    // DON'T change tab - stay on current tab
    setControlPanelDataset('man_pipes');

    // Set new map feature state
    mapRef.current.setFeatureState(
      { source: 'man_pipes', id: pipe.id },
      { selected: true }
    );
    setSelectedFeature({
      id: pipe.id,
      source: 'man_pipes',
      layer: 'man_pipes-layer',
    });

    // Popup at midpoint
    const midIndex = Math.floor(pipe.coordinates.length / 2);
    const midpoint = pipe.coordinates[midIndex];

    // Fly to the selected feature with smooth animation (center on midpoint)
    mapRef.current.flyTo({
      center: midpoint,
      zoom: CAMERA_ANIMATION.targetZoom,
      speed: CAMERA_ANIMATION.speed,
      curve: CAMERA_ANIMATION.curve,
      essential: CAMERA_ANIMATION.essential,
      easing: CAMERA_ANIMATION.easing,
    });

    // Show toast notifications
    toast.info(
      <div>
        <strong>{pipe.id}</strong> is selected. Go{' '}
        <button
          className="cursor-pointer border-none bg-transparent p-0 underline hover:text-[#5a525a]"
          onClick={() => {
            setControlPanelTab('stats');
          }}
        >
          here
        </button>{' '}
        for more details
      </div>
    );
  };

  const handleExitSimulation = () => {
    // Close sidebar first
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }

    // Navigate after a delay to ensure sidebar closes
    setTimeout(() => {
      router.push('/map');
    }, 200);
  };

  // Helper function to apply vulnerability colors to map layers
  const applyVulnerabilityColors = (vulnerabilityData: NodeDetails[]) => {
    const map = mapRef.current;
    if (!map) return;

    // Create vulnerability mapping: Node_ID -> Vulnerability_Category
    const vulnMap = new Map<string, string>();
    vulnerabilityData.forEach((node) => {
      vulnMap.set(node.Node_ID, node.Vulnerability_Category);
    });
    setVulnerabilityMap(vulnMap);

    // Debug: Log unique vulnerability categories
    const uniqueCategories = new Set(
      vulnerabilityData.map((node) => node.Vulnerability_Category)
    );
    console.log(
      'Unique vulnerability categories:',
      Array.from(uniqueCategories)
    );
    // console.log("Sample nodes:", vulnerabilityData.slice(0, 5));

    // Color mapping for vulnerability categories
    // Using a function to handle case-insensitive and flexible matching
    const getColorForCategory = (category: string): string => {
      const normalized = category.toLowerCase().trim();

      if (normalized.includes('high')) return '#D32F2F';
      if (normalized.includes('medium')) return '#FFA000';
      if (normalized.includes('low')) return '#FFF176';
      if (normalized.includes('no')) return '#388E3C';

      // Fallback based on exact matches
      const colorMap: Record<string, string> = {
        'High Risk': '#D32F2F',
        'Medium Risk': '#FFA000',
        'Low Risk': '#FFF176',
        'No Risk': '#388E3C',
        'high risk': '#D32F2F',
        'medium risk': '#FFA000',
        'low risk': '#FFF176',
        'no risk': '#388E3C',
      };

      return colorMap[category] || colorMap[normalized] || '#5687ca';
    };

    // Get darker stroke color for vulnerability categories
    const getStrokeColorForCategory = (category: string): string => {
      const normalized = category.toLowerCase().trim();

      if (normalized.includes('high')) return '#8B0000'; // Dark red
      if (normalized.includes('medium')) return '#B36200'; // Dark amber
      if (normalized.includes('low')) return '#C4B000'; // Dark yellow
      if (normalized.includes('no')) return '#1B5E20'; // Dark green

      // Fallback based on exact matches
      const strokeColorMap: Record<string, string> = {
        'High Risk': '#8B0000',
        'Medium Risk': '#B36200',
        'Low Risk': '#C4B000',
        'No Risk': '#1B5E20',
        'high risk': '#8B0000',
        'medium risk': '#B36200',
        'low risk': '#C4B000',
        'no risk': '#1B5E20',
      };

      return (
        strokeColorMap[category] || strokeColorMap[normalized] || '#00346c'
      );
    };

    // Build match expression for Mapbox for inlets
    // Format: ["match", ["get", "In_Name"], node1, color1, node2, color2, ..., defaultColor]
    const inletsMatchExpression: any[] = ['match', ['get', 'In_Name']];
    const inletsStrokeMatchExpression: any[] = ['match', ['get', 'In_Name']];

    vulnerabilityData.forEach((node) => {
      const color = getColorForCategory(node.Vulnerability_Category);
      const strokeColor = getStrokeColorForCategory(
        node.Vulnerability_Category
      );
      inletsMatchExpression.push(node.Node_ID, color);
      inletsStrokeMatchExpression.push(node.Node_ID, strokeColor);
      console.log(
        `Node ${node.Node_ID}: ${node.Vulnerability_Category} -> ${color} / ${strokeColor}`
      );
    });

    // Default color for inlets not in vulnerability data
    inletsMatchExpression.push('#00ca67'); // Original inlets color
    inletsStrokeMatchExpression.push('#005400'); // Original inlets stroke color

    // Build match expression for storm drains
    const drainsMatchExpression: any[] = ['match', ['get', 'In_Name']];
    const drainsStrokeMatchExpression: any[] = ['match', ['get', 'In_Name']];

    vulnerabilityData.forEach((node) => {
      const color = getColorForCategory(node.Vulnerability_Category);
      const strokeColor = getStrokeColorForCategory(
        node.Vulnerability_Category
      );
      drainsMatchExpression.push(node.Node_ID, color);
      drainsStrokeMatchExpression.push(node.Node_ID, strokeColor);
    });

    // Default color for drains not in vulnerability data
    drainsMatchExpression.push('#5687ca'); // Original storm_drains color
    drainsStrokeMatchExpression.push('#00346c'); // Original storm_drains stroke color

    // Update inlets-layer color and stroke
    if (map.getLayer('inlets-layer')) {
      map.setPaintProperty('inlets-layer', 'circle-color', [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#66ed7b', // Selected color (light green)
        inletsMatchExpression,
      ]);
      map.setPaintProperty('inlets-layer', 'circle-stroke-color', [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#307524', // Selected stroke color
        inletsStrokeMatchExpression,
      ]);
      // console.log("Updated inlets-layer color and stroke");
    }

    // Update storm_drains-layer color and stroke
    if (map.getLayer('storm_drains-layer')) {
      map.setPaintProperty('storm_drains-layer', 'circle-color', [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#49a8ff', // Selected color (cyan)
        drainsMatchExpression,
      ]);
      map.setPaintProperty('storm_drains-layer', 'circle-stroke-color', [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        '#355491', // Selected stroke color
        drainsStrokeMatchExpression,
      ]);
      // console.log("Updated storm_drains-layer color and stroke");
    }
  };

  // Helper function to convert RGB color from flood line to vulnerability category
  const getVulnerabilityFromColor = (color: string): string => {
    if (color.includes('211, 47, 47')) return 'High Risk'; // Red
    if (color.includes('255, 160, 0')) return 'Medium Risk'; // Orange
    if (color.includes('255, 235, 100')) return 'Low Risk'; // Yellow
    if (color.includes('56, 142, 60')) return 'No Risk'; // Green

    // For interpolated colors, determine based on RGB values
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return 'Medium Risk'; // Fallback

    const [, r, g] = match.map(Number);

    // Red-dominant → High Risk
    if (r > 200 && g < 100) return 'High Risk';
    // Yellow-dominant → Low Risk
    if (r > 200 && g > 200) return 'Low Risk';
    // Orange or intermediate → Medium Risk
    return 'Medium Risk';
  };

  // Helper function to sample points along a line, scaled by length
  const samplePointsFromLine = (
    lineFeature: GeoJSON.Feature<GeoJSON.LineString>,
    samplesPerSegment: number = 3 // Points per ~0.0005 degree segment (~55m)
  ): GeoJSON.Feature[] => {
    const coords = lineFeature.geometry.coordinates as [number, number][];
    if (coords.length < 2) return [];

    const props = lineFeature.properties || {};
    const vulnerability = getVulnerabilityFromColor(props.color || '');
    const points: GeoJSON.Feature[] = [];

    // Calculate total line length and cumulative distances
    const segLengths: number[] = [];
    let totalLength = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      const dx = coords[i + 1][0] - coords[i][0];
      const dy = coords[i + 1][1] - coords[i][1];
      const len = Math.sqrt(dx * dx + dy * dy);
      segLengths.push(len);
      totalLength += len;
    }
    if (totalLength === 0) return [];

    // Vulnerability multiplier - higher risk = more points = denser heatmap
    const vulnerabilityMultiplier =
      vulnerability === 'High Risk'
        ? 3
        : vulnerability === 'Medium Risk'
          ? 2
          : vulnerability === 'Low Risk'
            ? 1.5
            : 1;

    // Scale number of samples based on line length and vulnerability
    // Use ~0.0005 degrees (~55m) as the reference segment length
    const referenceSegLength = 0.0005;
    const numSegments = Math.max(
      1,
      Math.round(totalLength / referenceSegLength)
    );
    const numSamples = Math.max(
      samplesPerSegment,
      Math.round(numSegments * samplesPerSegment * vulnerabilityMultiplier)
    );

    // Sample evenly along the full line length (skip first and last to avoid node overlap)
    for (let i = 1; i <= numSamples; i++) {
      const t = i / (numSamples + 1);
      const targetDist = t * totalLength;

      // Walk along segments to find the point at targetDist
      let walked = 0;
      for (let s = 0; s < segLengths.length; s++) {
        if (walked + segLengths[s] >= targetDist) {
          const segT = (targetDist - walked) / segLengths[s];
          const lng = coords[s][0] + (coords[s + 1][0] - coords[s][0]) * segT;
          const lat = coords[s][1] + (coords[s + 1][1] - coords[s][1]) * segT;

          points.push({
            type: 'Feature',
            properties: {
              source: 'line',
              vulnerability: vulnerability,
              floodVolume: props.floodVolume || 0,
              pipeName: props.pipeName || '',
              phase: Math.random() * Math.PI * 2, // Random phase for animation
              offsetAngle: Math.random() * Math.PI * 2, // Random wobble direction
              offsetDistance: Math.random() * 0.00009, // ~9 meters max wobble
            },
            geometry: {
              type: 'Point',
              coordinates: [lng, lat],
            },
          } as GeoJSON.Feature);
          break;
        }
        walked += segLengths[s];
      }
    }

    return points;
  };

  // Helper function to check if a point is too close to any existing node point
  const isPointTooCloseToNodes = (
    linePoint: [number, number],
    nodeFeatures: GeoJSON.Feature[],
    minDistance: number = 0.00008 // ~9 meters (tuned for pipe spacing)
  ): boolean => {
    return nodeFeatures.some((nodeFeature) => {
      const nodeCoord = (nodeFeature.geometry as GeoJSON.Point).coordinates as [
        number,
        number,
      ];
      const dx = linePoint[0] - nodeCoord[0];
      const dy = linePoint[1] - nodeCoord[1];
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < minDistance;
    });
  };

  // Helper function to update Flood Propagation heatmap
  const updateFloodPropagation = async (vulnerabilityData: NodeDetails[]) => {
    const map = mapRef.current;
    if (!map) return;

    // Combine inlet and drain coordinates
    const allCoordinates = [...inletsRef.current, ...drainsRef.current];

    console.log(
      '[Flood Propagation] Total vulnerability data:',
      vulnerabilityData.length
    );
    console.log(
      '[Flood Propagation] Available coordinates:',
      allCoordinates.length
    );
    console.log(
      '[Flood Propagation] Flooded nodes:',
      vulnerabilityData.filter((n) => n.Total_Flood_Volume > 0).length
    );

    // Create GeoJSON features from NODE vulnerability data
    const nodeFloodPropagationFeatures: GeoJSON.Feature[] = vulnerabilityData
      .filter((node) => node.Total_Flood_Volume > 0) // Only include flooded nodes
      .map((node) => {
        // Find coordinates for this node
        const nodeCoord = allCoordinates.find((n) => n.id === node.Node_ID);
        if (!nodeCoord) {
          console.warn(
            `[Flood Propagation] No coordinates found for node: ${node.Node_ID}`
          );
          return null;
        }

        return {
          type: 'Feature' as const,
          properties: {
            source: 'node', // Mark as coming from node
            nodeId: node.Node_ID,
            vulnerability: node.Vulnerability_Category,
            floodVolume: node.Total_Flood_Volume,
            maximumRate: node.Maximum_Rate,
            hoursFlooded: node.Hours_Flooded,
            phase: Math.random() * Math.PI * 2, // Random phase for animation
            offsetAngle: Math.random() * Math.PI * 2, // Random wobble direction
            offsetDistance: Math.random() * 0.00009, // ~9 meters max wobble
          },
          geometry: {
            type: 'Point' as const,
            coordinates: nodeCoord.coordinates,
          },
        } as GeoJSON.Feature;
      })
      .filter((f): f is GeoJSON.Feature => f !== null);

    console.log(
      `[Flood Propagation] Created ${nodeFloodPropagationFeatures.length} node points`
    );

    // NEW: Load pipes and create LINE points for Flood Propagation
    let lineFloodPropagationFeatures: GeoJSON.Feature[] = [];

    try {
      const response = await fetch('/drainage/man_pipes.geojson');
      const pipesData = (await response.json()) as GeoJSON.FeatureCollection;
      const pipes = pipesData.features || [];

      console.log(
        `[Flood Propagation] Loaded ${pipes.length} pipes from GeoJSON`
      );

      // Generate flood line features (same logic as 3D flood)
      // Import createFloodAlongPipes from flood-3d-utils.ts
      const { createFloodAlongPipes } =
        await import('@/lib/map/effects/flood-3d-utils');

      const floodLines = createFloodAlongPipes(
        vulnerabilityData,
        allCoordinates,
        pipes as any
      );

      console.log(
        `[Flood Propagation] Generated ${floodLines.features.length} flood line segments`
      );

      // Convert line segments to sampled points
      const allLineSamplePoints = floodLines.features.flatMap(
        (lineFeature) =>
          samplePointsFromLine(
            lineFeature as GeoJSON.Feature<GeoJSON.LineString>,
            1
          ) // 1 point per segment (midpoint only)
      );

      console.log(
        `[Flood Propagation] Sampled ${allLineSamplePoints.length} points from lines`
      );

      // Filter out points too close to nodes
      lineFloodPropagationFeatures = allLineSamplePoints.filter((point) => {
        const coords = (point.geometry as GeoJSON.Point).coordinates as [
          number,
          number,
        ];
        return !isPointTooCloseToNodes(
          coords,
          nodeFloodPropagationFeatures,
          0.00008
        );
      });

      console.log(
        `[Flood Propagation] After filtering: ${lineFloodPropagationFeatures.length} line points ` +
          `(removed ${allLineSamplePoints.length - lineFloodPropagationFeatures.length} overlaps)`
      );
    } catch (error) {
      console.error(
        '[Flood Propagation] Error loading/processing pipe data:',
        error
      );
      // Continue with just node points if pipe loading fails
    }

    console.log(
      `[Flood Propagation] Total Flood Propagation points: ${nodeFloodPropagationFeatures.length + lineFloodPropagationFeatures.length} ` +
        `(${nodeFloodPropagationFeatures.length} nodes + ${lineFloodPropagationFeatures.length} lines)`
    );

    // Store features in refs for animation
    nodeFloodPropagationFeaturesRef.current = nodeFloodPropagationFeatures;
    lineFloodPropagationFeaturesRef.current = lineFloodPropagationFeatures;

    const nodeData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: nodeFloodPropagationFeatures,
    };

    const lineData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: lineFloodPropagationFeatures,
    };

    // Update both Flood Propagation sources with retry logic
    let retryCount = 0;
    const maxRetries = 10;

    const updateFloodPropagationData = () => {
      const nodeSource = map.getSource(
        'flood_propagation_nodes'
      ) as mapboxgl.GeoJSONSource;
      const lineSource = map.getSource(
        'flood_propagation_lines'
      ) as mapboxgl.GeoJSONSource;
      const nodeLayer = map.getLayer('flood_propagation-nodes-layer');
      const lineLayer = map.getLayer('flood_propagation-lines-layer');

      if (nodeSource && nodeLayer && lineSource && lineLayer) {
        console.log(
          '[Flood Propagation] Sources and layers found, setting data...'
        );

        nodeSource.setData(nodeData);
        lineSource.setData(lineData);

        setIsFloodPropagationActive(true);
        shouldAnimateFloodPropagationRef.current = true;

        // Start animation if not already running
        if (!isFloodPropagationAnimating) {
          setIsFloodPropagationAnimating(true);
          animateFloodPropagationIntensity();
        }

        console.log(
          '[Flood Propagation] Flood Propagation data set successfully (nodes + lines)'
        );
      } else {
        retryCount++;
        if (retryCount < maxRetries) {
          console.warn(
            `[Flood Propagation] Sources or layers not ready (attempt ${retryCount}/${maxRetries}), retrying...`
          );
          setTimeout(updateFloodPropagationData, 300);
        } else {
          console.error(
            '[Flood Propagation] Failed to update after max retries'
          );
        }
      }
    };

    // Always use a slight delay to ensure map is fully ready
    setTimeout(() => {
      updateFloodPropagationData();
    }, 500);
  };

  const handleClosePopUps = () => {
    setIsTableMinimized(true);
    setIsTable3Minimized(true);
    setTableData(null);
    setTableData3(null);
    setActivePanel(null);

    // Both 3D flood gradient and flood propagation heatmap persist after closing
    // This allows viewing results without the table open
  };
  // Vulnerability table handlers
  const handleGenerateTable = async () => {
    if (!selectedYear) return;

    setIsLoadingTable(true);
    try {
      // Enforce minimum 2-second loading time for better UX
      const [data] = await Promise.all([
        fetchYRTable(selectedYear),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);

      setTableData(data);
      setIsTableMinimized(false);

      // Hide outlets and pipes layers when table is generated
      setOverlayVisibility((prev) => ({
        ...prev,
        'outlets-layer': false,
        'man_pipes-layer': false,
      }));

      // Apply vulnerability colors to inlets and storm drains
      applyVulnerabilityColors(data);

      // Update Flood Propagation
      updateFloodPropagation(data);

      // Enable rain effect
      setIsRainActive(true);

      // Enable 3D flood visualization
      if (mapRef.current) {
        enableFlood3D(
          mapRef.current,
          data,
          inletsRef.current,
          drainsRef.current,
          {
            opacity: 0.7,
            animate: true,
            animationDuration: 3000,
          }
        )
          .then(() => {
            setIsFlood3DActive(true);
          })
          .catch((error) => {
            console.error('Error enabling 3D flood:', error);
          });
      }

      toast.success(
        `Successfully loaded ${data.length} nodes for ${selectedYear}YR`
      );
    } catch (error) {
      console.error('Error fetching vulnerability data:', error);
      toast.error('Failed to load vulnerability data. Please try again.');
      setTableData(null);
    } finally {
      setIsLoadingTable(false);
    }
  };

  // model 1 table handler
  const handleGenerateTable3 = async () => {
    if (selectedComponentIds.length === 0) {
      toast.error('Please select at least one component');
      return;
    }

    // Close panels before starting
    if (activePanel === 'node') {
      setActivePanel(null);
    }
    if (activePanel === 'link') {
      setActivePanel(null);
    }

    setIsLoadingTable3(true);
    try {
      // Build nodes object from componentParams
      const nodes: Record<string, any> = {};
      componentParams.forEach((params, id) => {
        nodes[id] = params;
      });

      // Build links object from pipeParams
      const links: Record<string, any> = {};
      pipeParams.forEach((params, id) => {
        links[id] = params;
      });

      // Enforce minimum 2-second loading time for better UX
      const [response] = await Promise.all([
        runSimulation(nodes, links, rainfallParams),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);

      // Transform the nodes_list to NodeDetails format
      const transformedData = transformToNodeDetails(
        response.nodes_list,
        rainfallParams.duration_hr
      );

      setTableData3(transformedData);
      setIsTable3Minimized(false);

      // Hide outlets and pipes layers when table is generated
      setOverlayVisibility((prev) => ({
        ...prev,
        'outlets-layer': false,
        'man_pipes-layer': false,
      }));

      // Apply vulnerability colors to inlets and storm drains
      applyVulnerabilityColors(transformedData);

      // Update Flood Propagation
      updateFloodPropagation(transformedData);

      // Enable rain effect
      setIsRainActive(true);

      // Enable 3D flood visualization
      if (mapRef.current) {
        enableFlood3D(
          mapRef.current,
          transformedData,
          inletsRef.current,
          drainsRef.current,
          {
            opacity: 0.7,
            animate: true,
            animationDuration: 3000,
          }
        )
          .then(() => {
            setIsFlood3DActive(true);
          })
          .catch((error) => {
            console.error('Error enabling 3D flood:', error);
          });
      }

      toast.success(
        `Successfully generated vulnerability data for ${transformedData.length} nodes`
      );
    } catch (error) {
      console.error('Error running simulation:', error);
      toast.error('Simulation failed. Please try again.');
      setTableData3(null);
    } finally {
      setIsLoadingTable3(false);
    }
  };

  const handleToggleTableMinimize = () => {
    setIsTableMinimized(!isTableMinimized);
  };

  const handleCloseTable = () => {
    setTableData(null);
    setIsTableMinimized(false);

    // Both 3D flood gradient and flood propagation heatmap persist after closing
    // This allows viewing results without the table open
  };

  const handleYearChange = (year: number | null) => {
    setSelectedYear(year as YearOption | null);
  };

  // model 1 table handlers
  const handleToggleTable3Minimize = () => {
    setIsTable3Minimized(!isTable3Minimized);
  };

  const handleCloseTable3 = () => {
    setTableData3(null);
    setIsTable3Minimized(false);

    // Both 3D flood gradient and flood propagation heatmap persist after closing
    // This allows viewing results without the table open
  };

  // Rain toggle handler
  const handleToggleRain = useCallback(
    (enabled: boolean) => {
      setIsRainActive(enabled);
    },
    []
  );

  // Flood Propagation animation - per-point varied pulsing + position wobbling
  const animateFloodPropagationIntensity = useCallback(() => {
    if (!mapRef.current || !shouldAnimateFloodPropagationRef.current) {
      // Cancel any pending frame before exiting
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      setIsFloodPropagationAnimating(false);
      return;
    }

    // Throttle to ~20fps to avoid excessive source updates
    const now = Date.now();
    if (now - lastAnimationTimeRef.current < 50) {
      animationFrameRef.current = requestAnimationFrame(
        animateFloodPropagationIntensity
      );
      return;
    }
    lastAnimationTimeRef.current = now;

    const nodeSource = mapRef.current.getSource(
      'flood_propagation_nodes'
    ) as mapboxgl.GeoJSONSource;
    const lineSource = mapRef.current.getSource(
      'flood_propagation_lines'
    ) as mapboxgl.GeoJSONSource;

    if (!nodeSource && !lineSource) {
      setIsFloodPropagationAnimating(false);
      return;
    }

    const time = now / 1000;
    const pulseSpeed = 0.3; // Cycles per second (slower)
    const pulseAmount = 0.35; // 35% depth - oscillates from 0.65 to 1.0

    // Update node features with per-point pulsed multipliers + coordinate wobbling
    if (nodeSource && nodeFloodPropagationFeaturesRef.current.length > 0) {
      const wobbledNodes = nodeFloodPropagationFeaturesRef.current.map(
        (feature) => {
          const phase = feature.properties?.phase || 0;
          const offsetAngle = feature.properties?.offsetAngle || 0;
          const offsetDistance = feature.properties?.offsetDistance || 0;

          // Calculate pulse multiplier
          const pulse =
            1 -
            pulseAmount / 2 +
            Math.sin(time * pulseSpeed * Math.PI * 2 + phase) * pulseAmount;

          // Calculate wobble offset (oscillates based on phase)
          const wobbleAmount =
            Math.sin(time * pulseSpeed * Math.PI * 2 + phase) * offsetDistance;

          // Apply wobble to coordinates
          const pointGeometry = feature.geometry as GeoJSON.Point;
          const [lng, lat] = pointGeometry.coordinates as [number, number];
          const wobbledLng = lng + Math.cos(offsetAngle) * wobbleAmount;
          const wobbledLat = lat + Math.sin(offsetAngle) * wobbleAmount;

          return {
            ...feature,
            geometry: {
              type: 'Point' as const,
              coordinates: [wobbledLng, wobbledLat],
            },
            properties: {
              ...feature.properties,
              pulseMultiplier: pulse,
            },
          };
        }
      );

      nodeSource.setData({
        type: 'FeatureCollection',
        features: wobbledNodes,
      });
    }

    // Update line features with per-point pulsed multipliers + coordinate wobbling
    if (lineSource && lineFloodPropagationFeaturesRef.current.length > 0) {
      const wobbledLines = lineFloodPropagationFeaturesRef.current.map(
        (feature) => {
          const phase = feature.properties?.phase || 0;
          const offsetAngle = feature.properties?.offsetAngle || 0;
          const offsetDistance = feature.properties?.offsetDistance || 0;

          // Calculate pulse multiplier
          const pulse =
            1 -
            pulseAmount / 2 +
            Math.sin(time * pulseSpeed * Math.PI * 2 + phase) * pulseAmount;

          // Calculate wobble offset (oscillates based on phase)
          const wobbleAmount =
            Math.sin(time * pulseSpeed * Math.PI * 2 + phase) * offsetDistance;

          // Apply wobble to coordinates
          const pointGeometry = feature.geometry as GeoJSON.Point;
          const [lng, lat] = pointGeometry.coordinates as [number, number];
          const wobbledLng = lng + Math.cos(offsetAngle) * wobbleAmount;
          const wobbledLat = lat + Math.sin(offsetAngle) * wobbleAmount;

          return {
            ...feature,
            geometry: {
              type: 'Point' as const,
              coordinates: [wobbledLng, wobbledLat],
            },
            properties: {
              ...feature.properties,
              pulseMultiplier: pulse,
            },
          };
        }
      );

      lineSource.setData({
        type: 'FeatureCollection',
        features: wobbledLines,
      });
    }

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(
      animateFloodPropagationIntensity
    );
  }, []);

  // Flood Propagation toggle handler
  const handleToggleFloodPropagation = useCallback(
    (enabled: boolean) => {
      if (!mapRef.current) return;

      const nodesLayer = mapRef.current.getLayer(
        'flood_propagation-nodes-layer'
      );
      const linesLayer = mapRef.current.getLayer(
        'flood_propagation-lines-layer'
      );

      if (!nodesLayer && !linesLayer) {
        console.warn(
          '[Flood Propagation] Toggle failed - Flood Propagation layers not found'
        );
        return;
      }


      const visibility = enabled ? 'visible' : 'none';

      // Toggle both Flood Propagation layers
      if (nodesLayer) {
        mapRef.current.setLayoutProperty(
          'flood_propagation-nodes-layer',
          'visibility',
          visibility
        );
      }
      if (linesLayer) {
        mapRef.current.setLayoutProperty(
          'flood_propagation-lines-layer',
          'visibility',
          visibility
        );
      }

      setIsFloodPropagationActive(enabled);
      shouldAnimateFloodPropagationRef.current = enabled;

      // Start or stop animation
      if (enabled) {
        setIsFloodPropagationAnimating(true);
        animateFloodPropagationIntensity();
      } else {
        setIsFloodPropagationAnimating(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      }

      // Force map to repaint
      mapRef.current.triggerRepaint();

    },
    [animateFloodPropagationIntensity]
  );

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Synchronize rain effect with state
  useEffect(() => {
    if (!mapRef.current) return;

    if (isRainActive) {
      enableRain(mapRef.current);
    } else {
      disableRain(mapRef.current);
    }
  }, [isRainActive]);

  // Helper function to parse Node_ID and determine source and feature ID
  const parseNodeId = (
    nodeId: string
  ): { source: string | null; featureId: string | null } => {
    if (nodeId.startsWith('ISD-')) {
      // Storm drain: ISD-* maps to storm_drains source with In_Name as promoteId
      return { source: 'storm_drains', featureId: nodeId };
    } else if (nodeId.startsWith('I-')) {
      // Inlet: I-* maps to inlets source with In_Name as promoteId
      return { source: 'inlets', featureId: nodeId };
    }
    return { source: null, featureId: null };
  };

  // Handler for highlighting nodes from vulnerability table
  const handleHighlightNodes = (nodeIds: Set<string>) => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous highlights
    highlightedNodes.forEach((nodeId) => {
      const { source, featureId } = parseNodeId(nodeId);
      if (source && featureId && map.getSource(source)) {
        map.setFeatureState({ source, id: featureId }, { selected: false });
      }
    });

    // Apply new highlights
    nodeIds.forEach((nodeId) => {
      const { source, featureId } = parseNodeId(nodeId);
      if (source && featureId && map.getSource(source)) {
        map.setFeatureState({ source, id: featureId }, { selected: true });
      }
    });

    setHighlightedNodes(nodeIds);
  };

  // Handler for opening node simulation slideshow
  const handleOpenNodeSimulation = async (nodeId: string) => {
    const map = mapRef.current;
    if (!map) return;

    // Parse node ID to get source and feature ID
    const { source, featureId } = parseNodeId(nodeId);
    if (!source || !featureId) {
      toast.error('Unable to locate node on map');
      return;
    }

    // Find the node coordinates from our data
    let coordinates: [number, number] | null = null;
    if (source === 'inlets') {
      const inlet = inletsRef.current.find((i) => i.id === featureId);
      if (inlet) coordinates = inlet.coordinates;
    } else if (source === 'storm_drains') {
      const drain = drainsRef.current.find((d) => d.id === featureId);
      if (drain) coordinates = drain.coordinates;
    }

    if (!coordinates) {
      toast.error('Unable to locate node coordinates');
      return;
    }

    // If selectedYear is not set (model 2 scenario), try to extract it from table data
    let yearToUse = selectedYear;
    if (!yearToUse) {
      // Try to find the year from model 2 table data
      if (tableData3) {
        const nodeData = tableData3.find((node) => node.Node_ID === nodeId);
        if (nodeData && nodeData.YR) {
          // Set the year from the node data
          yearToUse = nodeData.YR as YearOption;
          setSelectedYear(yearToUse);
        } else {
          toast.error('Unable to determine year for simulation data');
          return;
        }
      } else {
        toast.error('Please select a year or generate simulation data first');
        return;
      }
    }

    // Step 1: Extract node data and all data from the appropriate table
    const activeTableData = tableData3 || tableData;
    if (!activeTableData) {
      toast.error('No table data available');
      return;
    }

    const nodeData = activeTableData.find((node) => node.Node_ID === nodeId);
    if (!nodeData) {
      toast.error('Node data not found in table');
      return;
    }

    // Step 2: Minimize both tables instead of closing them (model 1 and model 2)
    setIsTableMinimized(true);
    setIsTable3Minimized(true);

    // Step 3: Wait for tables to minimize and year state to update (300ms delay)
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Step 4: Fly to the node
    map.flyTo({
      center: coordinates,
      zoom: CAMERA_ANIMATION.targetZoom,
      speed: CAMERA_ANIMATION.speed,
      curve: CAMERA_ANIMATION.curve,
      essential: CAMERA_ANIMATION.essential,
      easing: CAMERA_ANIMATION.easing,
    });

    // Step 5: Wait for flyTo animation to mostly complete
    // Calculate approximate duration based on distance and speed
    const flyDuration = 1500; // ~1.5 seconds for fly animation
    await new Promise((resolve) => setTimeout(resolve, flyDuration));

    // Step 6: Highlight the node on the map
    map.setFeatureState({ source, id: featureId }, { selected: true });

    // Step 7: Wait a bit for highlight to be visible (200ms)
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Step 8: Set slideshow data and show the slideshow
    setSlideshowNodeData(nodeData);
    setSlideshowAllData(activeTableData);
    setSlideshowNode(nodeId);
  };

  // Handler for closing slideshow
  const handleCloseSlideshowNode = () => {
    const map = mapRef.current;
    if (!map || !slideshowNode) return;

    // Clear highlight
    const { source, featureId } = parseNodeId(slideshowNode);
    if (source && featureId && map.getSource(source)) {
      map.setFeatureState({ source, id: featureId }, { selected: false });
    }

    // Clear all slideshow state
    setSlideshowNode(null);
    setSlideshowNodeData(null);
    setSlideshowAllData(null);
    setIsTableMinimized(false);
    setIsTable3Minimized(false);
  };

  // Cleanup effects when component unmounts (flood clears automatically with map)
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        disableRain(mapRef.current);
      }
    };
  }, []);

  return (
    <>
      <style>{`
        html, body {
          overflow: hidden !important;
        }
      `}</style>
      <main className="relative flex min-h-screen flex-col overflow-hidden" style={{ backgroundColor: '#1e1e1e' }}>
        <div
          className="relative h-screen w-full"
          style={{ pointerEvents: isSimulationActive ? 'auto' : 'none', backgroundColor: '#1e1e1e' }}
        >
          <div ref={mapContainerRef} className="h-full w-full" style={{ backgroundColor: '#1e1e1e' }} />

          {/* Grey overlay when simulation is not active */}
          {!isSimulationActive && (
            <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ backgroundColor: '#1e1e1e' }}>
              <div className="text-xl font-medium text-white">
                Enter Simulation Mode to activate map
              </div>
            </div>
          )}
        </div>
        <ControlPanel
          activeTab={controlPanelTab}
          dataset={controlPanelDataset}
          selectedInlet={selectedInlet}
          selectedOutlet={selectedOutlet}
          selectedPipe={selectedPipe}
          selectedDrain={selectedDrain}
          onTabChange={setControlPanelTab}
          onDatasetChange={setControlPanelDataset}
          onSelectInlet={handleSelectInlet}
          onSelectOutlet={handleSelectOutlet}
          onSelectDrain={handleSelectDrain}
          onSelectPipe={handleSelectPipe}
          onBack={handleControlPanelBack}
          overlaysVisible={someVisible}
          onToggle={handleToggleAllOverlays}
          overlays={overlayData}
          onToggleOverlay={handleOverlayToggle}
          selectedFloodScenario={selectedFloodScenario}
          onChangeFloodScenario={setSelectedFloodScenario}
          isSimulationMode={isSimulationActive}
          selectedPointForSimulation={selectedPointForSimulation}
          reports={[]}
          allReportsData={[]}
          selectedComponentIds={selectedComponentIds}
          onComponentIdsChange={setSelectedComponentIds}
          selectedPipeIds={selectedPipeIds}
          onPipeIdsChange={setSelectedPipeIds}
          componentParams={componentParams}
          onComponentParamsChange={setComponentParams}
          pipeParams={pipeParams}
          onPipeParamsChange={setPipeParams}
          rainfallParams={rainfallParams}
          onRainfallParamsChange={setRainfallParams}
          showNodePanel={activePanel === 'node'}
          onToggleNodePanel={handleToggleNodePanel}
          showLinkPanel={activePanel === 'link'}
          onToggleLinkPanel={handleToggleLinkPanel}
          onRefreshReports={async () => {}}
          isRefreshingReports={false}
          selectedYear={selectedYear}
          onYearChange={handleYearChange}
          onGenerateTable={handleGenerateTable}
          isLoadingTable={isLoadingTable}
          onCloseTable={handleCloseTable}
          hasTable={!!tableData}
          isTableMinimized={isTableMinimized}
          onToggleTableMinimize={handleToggleTableMinimize}
          onGenerateTable3={handleGenerateTable3}
          isLoadingTable3={isLoadingTable3}
          onCloseTable3={handleCloseTable3}
          hasTable3={!!tableData3}
          isTable3Minimized={isTable3Minimized}
          onToggleTable3Minimize={handleToggleTable3Minimize}
          onOpenNodeSimulation={handleOpenNodeSimulation}
          onClosePopUps={handleClosePopUps}
          isRainActive={isRainActive}
          onToggleRain={handleToggleRain}
          isFloodPropagationActive={isFloodPropagationActive}
          onToggleFloodPropagation={handleToggleFloodPropagation}
          isFloodScenarioLoading={isFloodScenarioLoading}
        />
        <CameraControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetPosition={handleResetPosition}
          onChangeStyle={handleChangeStyle}
          isSimulationActive={isSimulationActive}
          onExitSimulation={handleExitSimulation}
        />

        {/* Vulnerability Data Table Overlay (model 1) */}
        {/* Vulnerability Data Table Overlay (model 1) - Only render when NOT minimized */}
        {tableData && !isTableMinimized && (
          <div
            className="pointer-events-auto absolute z-20"
            style={{
              left: `${tablePosition.x}px`,
              top: `${tablePosition.y}px`,
            }}
          >
            {isLoadingTable ? (
              <Spinner />
            ) : (
              <VulnerabilityDataTable
                data={tableData}
                isMinimized={false}
                onToggleMinimize={handleToggleTableMinimize}
                position={tablePosition}
                onPositionChange={setTablePosition}
                onHighlightNodes={handleHighlightNodes}
                onOpenNodeSimulation={handleOpenNodeSimulation}
              />
            )}
          </div>
        )}

        {/* Vulnerability Data Table Overlay (model 2) - Only render when NOT minimized */}
        {tableData3 && !isTable3Minimized && (
          <div
            className="pointer-events-auto absolute z-20"
            style={{
              left: `${table3Position.x}px`,
              top: `${table3Position.y}px`,
            }}
          >
            {isLoadingTable3 ? (
              <Spinner />
            ) : (
              <VulnerabilityDataTable
                data={tableData3}
                isMinimized={false}
                onToggleMinimize={handleToggleTable3Minimize}
                position={table3Position}
                onPositionChange={setTable3Position}
                onHighlightNodes={handleHighlightNodes}
                onOpenNodeSimulation={handleOpenNodeSimulation}
              />
            )}
          </div>
        )}

        {/* Node Simulation Slideshow */}
        {slideshowNode &&
          selectedYear &&
          slideshowNodeData &&
          slideshowAllData && (
            <NodeSimulationSlideshow
              nodeId={slideshowNode}
              onClose={handleCloseSlideshowNode}
              selectedYear={selectedYear}
              nodeData={slideshowNodeData}
              allNodesData={slideshowAllData}
            />
          )}

        {/* Node Parameters Panel - Draggable */}
        {activePanel === 'node' && selectedComponentIds.length > 0 && (
          <div
            style={{
              position: 'fixed',
              left: nodePanelPosition.x,
              top: nodePanelPosition.y,
              zIndex: 1000,
            }}
          >
            <NodeParametersPanel
              selectedComponentIds={selectedComponentIds}
              componentParams={componentParams}
              onUpdateParam={updateComponentParam}
              onClose={() => setActivePanel(null)}
              position={nodePanelPosition}
              onPositionChange={setNodePanelPosition}
              inlets={inlets}
              drains={drains}
            />
          </div>
        )}

        {/* Link Parameters Panel - Draggable */}
        {activePanel === 'link' && selectedPipeIds.length > 0 && (
          <div
            style={{
              position: 'fixed',
              left: linkPanelPosition.x,
              top: linkPanelPosition.y,
              zIndex: 1000,
            }}
          >
            <LinkParametersPanel
              selectedPipeIds={selectedPipeIds}
              pipeParams={pipeParams}
              onUpdateParam={updatePipeParam}
              onClose={() => setActivePanel(null)}
              position={linkPanelPosition}
              onPositionChange={setLinkPanelPosition}
            />
          </div>
        )}
      </main>
    </>
  );
}
