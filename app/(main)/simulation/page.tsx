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
import { applyVulnerabilityColors as applyVulnerabilityColorsOnMap } from '@/lib/map/effects/vulnerability-colors';
import { addSimulationLayers } from '@/lib/map/simulation-layers';
import {
  buildFloodPropagationFeatures,
  setFloodPropagationData,
} from '@/lib/map/effects/flood-propagation';

import {
  SIMULATION_MAP_STYLE,
  SIMULATION_PITCH,
  SIMULATION_BEARING,
  SIMULATION_LAYER_IDS,
  LAYER_COLORS,
  CAMERA_ANIMATION,
} from '@/lib/map/simulation-config';
import mapboxgl from 'mapbox-gl';
import {
  useInlets,
  useOutlets,
  useDrains,
  usePipes,
} from '@/lib/query/hooks/use-drainage-data';
import type {
  DatasetType,
  Inlet,
  Outlet,
  Drain,
  Pipe,
} from '@/components/control-panel/types';
import type {
  NodeParams,
  LinkParams,
} from '@/components/control-panel/tabs/simulation-models/model3';
import {
  parseNodeId,
  CAMERA_FLY_DURATION_MS,
  FLOOD_PULSE_AMOUNT,
  FLOOD_PULSE_SPEED_HZ,
} from './page.helpers';

import 'mapbox-gl/dist/mapbox-gl.css';
import { useSidebar } from '@/components/ui/sidebar';
import { toast } from 'sonner';
import { VulnerabilityDataTable } from '@/components/vulnerability-data-table';
import { fetchYRTable } from '@/lib/vulnerabilities/fetch-yr-table';
import { NodeSimulationSlideshow } from '@/components/node-simulation-slideshow';
import { NodeParametersPanel } from '@/components/node-parameters-panel';
import { LinkParametersPanel } from '@/components/link-parameters-panel';
import { Spinner } from '@/components/ui/spinner';
import { useLatestRef } from '@/hooks/use-latest-ref';
import {
  usePersistentPosition,
  useAnchoredPosition,
} from '@/hooks/use-persistent-position';
import type { NodeDetails } from '@/types/simulation';

type YearOption = 2 | 5 | 10 | 15 | 20 | 25 | 50 | 100;

/** Identifies a feature whose Mapbox `selected` feature-state is set. */
interface SelectedFeature {
  id: string | number;
  source: string;
  layer: string;
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

/** Floating vulnerability tables sit right of centre, clear of the control panel. */
const FLOATING_TABLE_ANCHOR = { width: 500, height: 600, anchorX: 0.6 };

/** Node and link parameter panels open centred. */
const PARAMETER_PANEL_ANCHOR = { width: 500, height: 600 };

const FLOOD_3D_OPTIONS = {
  opacity: 0.7,
  animate: true,
  animationDuration: 3000,
};

/**
 * Both table generators finish no sooner than this. Results can arrive almost
 * instantly, and a spinner that flashes reads as a glitch rather than work.
 */
const MIN_GENERATE_DURATION_MS = 2000;

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

  const [selectedFeature, setSelectedFeature] =
    useState<SelectedFeature | null>(null);
  const selectedFeatureRef = useLatestRef(selectedFeature);

  const layerIds = useMemo(() => SIMULATION_LAYER_IDS, []);

  // Load data from hooks with TanStack Query
  const { data: inlets = [] } = useInlets();
  const { data: outlets = [] } = useOutlets();
  const { data: pipes = [] } = usePipes();
  const { data: drains = [] } = useDrains();

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
  const [tablePosition, setTablePosition] = useAnchoredPosition(
    FLOATING_TABLE_ANCHOR
  );
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(
    new Set()
  );

  // model 1 table state
  const [tableData3, setTableData3] = useState<NodeDetails[] | null>(null);
  const [isLoadingTable3, setIsLoadingTable3] = useState(false);
  const [isTable3Minimized, setIsTable3Minimized] = useState(false);
  const [table3Position, setTable3Position] = useAnchoredPosition(
    FLOATING_TABLE_ANCHOR
  );

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
  const [componentParams, setComponentParams] = useState<
    Map<string, NodeParams>
  >(new Map());
  const [pipeParams, setPipeParams] = useState<Map<string, LinkParams>>(
    new Map()
  );
  const [rainfallParams, setRainfallParams] =
    useState<RainfallParams>(rainfallVal);

  // Rain effect state
  const [isRainActive, setIsRainActive] = useState(false); // Start with false, will be set when table is generated
  const [isFloodScenarioLoading, setIsFloodScenarioLoading] = useState(false);
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
  const [nodePanelPosition, setNodePanelPosition] = usePersistentPosition(
    'nodePanelPosition',
    PARAMETER_PANEL_ANCHOR
  );

  const [linkPanelPosition, setLinkPanelPosition] = usePersistentPosition(
    'linkPanelPosition',
    PARAMETER_PANEL_ANCHOR
  );

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

  // The Mapbox click handler is registered once, so it must read drainage
  // data and the current selection through refs rather than closing over them.
  const inletsRef = useLatestRef(inlets);
  const outletsRef = useLatestRef(outlets);
  const pipesRef = useLatestRef(pipes);
  const drainsRef = useLatestRef(drains);

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

      const addCustomLayers = () => addSimulationLayers(map);

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
  const updateComponentParam = (
    id: string,
    key: keyof NodeParams,
    value: number
  ) => {
    const newParams = new Map(componentParams);
    const current =
      newParams.get(id) ??
      ({
        inv_elev: 0,
        init_depth: 0,
        ponding_area: 0,
        surcharge_depth: 0,
      } satisfies NodeParams);
    newParams.set(id, { ...current, [key]: value });
    setComponentParams(newParams);
  };

  const updatePipeParam = (
    id: string,
    key: keyof LinkParams,
    value: number
  ) => {
    const newParams = new Map(pipeParams);
    const current =
      newParams.get(id) ??
      ({
        init_flow: 0,
        upstrm_offset_depth: 0,
        downstrm_offset_depth: 0,
        avg_conduit_loss: 0,
      } satisfies LinkParams);
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
      const nodesLayer = mapRef.current.getLayer(
        'flood_propagation-nodes-layer'
      );
      const linesLayer = mapRef.current.getLayer(
        'flood_propagation-lines-layer'
      );

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

  /**
   * Marks a feature as selected on the map and flies the camera to it.
   *
   * Every dataset names its Mapbox layer after its source, so the layer is
   * derived rather than passed.
   */
  const focusMapFeature = (
    source: DatasetType,
    id: string,
    center: [number, number]
  ) => {
    const map = mapRef.current;
    if (!map) return;

    map.setFeatureState({ source, id }, { selected: true });
    setSelectedFeature({ id, source, layer: `${source}-layer` });

    map.flyTo({
      center,
      zoom: CAMERA_ANIMATION.targetZoom,
      speed: CAMERA_ANIMATION.speed,
      curve: CAMERA_ANIMATION.curve,
      essential: CAMERA_ANIMATION.essential,
      easing: CAMERA_ANIMATION.easing,
    });
  };

  /** Toast body with a link through to the stats tab. */
  const selectionToast = (lead: React.ReactNode, trailer: string) => (
    <div>
      {lead}{' '}
      <button
        className="cursor-pointer border-none bg-transparent p-0 underline hover:text-[#5a525a]"
        onClick={() => setControlPanelTab('stats')}
      >
        here
      </button>{' '}
      {trailer}
    </div>
  );

  const handleSelectInlet = (inlet: Inlet) => {
    if (!mapRef.current) return;

    clearSelections();

    setSelectedInlet(inlet);
    setControlPanelTab('simulations');
    setControlPanelDataset('inlets');
    setSelectedPointForSimulation(inlet.id);

    focusMapFeature('inlets', inlet.id, inlet.coordinates);

    toast.info(
      selectionToast('Outlet distance updated. Go', 'to view more details')
    );
  };

  const handleSelectOutlet = (outlet: Outlet) => {
    if (!mapRef.current) return;

    clearSelections();

    setSelectedOutlet(outlet);
    // Deliberately keeps the current tab.
    setControlPanelDataset('outlets');

    focusMapFeature('outlets', outlet.id, outlet.coordinates);

    toast.info(
      selectionToast(
        <>
          <strong>{outlet.id}</strong> is selected. Go
        </>,
        'to view details'
      )
    );
  };

  const handleSelectDrain = (drain: Drain) => {
    if (!mapRef.current) return;

    clearSelections();

    setSelectedDrain(drain);
    setControlPanelTab('simulations');
    setControlPanelDataset('storm_drains');
    setSelectedPointForSimulation(drain.id);

    focusMapFeature('storm_drains', drain.id, drain.coordinates);

    toast.info(
      selectionToast('Outlet distance updated. Go', 'for more details')
    );
  };

  const handleSelectPipe = (pipe: Pipe) => {
    if (!mapRef.current) return;
    if (!pipe.coordinates || pipe.coordinates.length === 0) return;

    clearSelections();

    setSelectedPipe(pipe);
    // Deliberately keeps the current tab.
    setControlPanelDataset('man_pipes');

    // A pipe is a line, so the camera targets its midpoint.
    const midpoint = pipe.coordinates[Math.floor(pipe.coordinates.length / 2)];
    focusMapFeature('man_pipes', pipe.id, midpoint);

    toast.info(
      selectionToast(
        <>
          <strong>{pipe.id}</strong> is selected. Go
        </>,
        'for more details'
      )
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
    applyVulnerabilityColorsOnMap(map, vulnerabilityData);
  };

  /**
   * Rebuild the flood-propagation heatmap from a set of results and push it
   * onto the map, starting the pulse animation once the data lands.
   */
  const updateFloodPropagation = async (vulnerabilityData: NodeDetails[]) => {
    const map = mapRef.current;
    if (!map) return;

    const features = await buildFloodPropagationFeatures(vulnerabilityData, [
      ...inletsRef.current,
      ...drainsRef.current,
    ]);

    // The animation reads the features through refs on every frame.
    nodeFloodPropagationFeaturesRef.current = features.nodes;
    lineFloodPropagationFeaturesRef.current = features.lines;

    setFloodPropagationData(map, features, () => {
      setIsFloodPropagationActive(true);
      shouldAnimateFloodPropagationRef.current = true;

      if (!isFloodPropagationAnimating) {
        setIsFloodPropagationAnimating(true);
        animateFloodPropagationIntensity();
      }
    });
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
  /**
   * Switches the map into "results" mode for a freshly generated table:
   * clears the layers that would obscure the results, recolours nodes by
   * vulnerability, and starts the rain and 3D flood visualisations.
   */
  const showVulnerabilityOnMap = (data: NodeDetails[]) => {
    // Outlets and pipes would sit on top of the vulnerability colours.
    setOverlayVisibility((prev) => ({
      ...prev,
      'outlets-layer': false,
      'man_pipes-layer': false,
    }));

    applyVulnerabilityColors(data);
    updateFloodPropagation(data);
    setIsRainActive(true);

    if (mapRef.current) {
      enableFlood3D(
        mapRef.current,
        data,
        inletsRef.current,
        drainsRef.current,
        FLOOD_3D_OPTIONS
      ).catch((error) => console.error('Error enabling 3D flood:', error));
    }
  };

  const handleGenerateTable = async () => {
    if (!selectedYear) return;

    setIsLoadingTable(true);
    try {
      const [data] = await Promise.all([
        fetchYRTable(selectedYear),
        new Promise((resolve) => setTimeout(resolve, MIN_GENERATE_DURATION_MS)),
      ]);

      setTableData(data);
      setIsTableMinimized(false);

      showVulnerabilityOnMap(data);

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
      const nodes: Record<string, NodeParams> = {};
      componentParams.forEach((params, id) => {
        nodes[id] = params;
      });

      // Build links object from pipeParams
      const links: Record<string, LinkParams> = {};
      pipeParams.forEach((params, id) => {
        links[id] = params;
      });

      const [response] = await Promise.all([
        runSimulation(nodes, links, rainfallParams),
        new Promise((resolve) => setTimeout(resolve, MIN_GENERATE_DURATION_MS)),
      ]);

      // Transform the nodes_list to NodeDetails format
      const transformedData = transformToNodeDetails(
        response.nodes_list,
        rainfallParams.duration_hr
      );

      setTableData3(transformedData);
      setIsTable3Minimized(false);

      showVulnerabilityOnMap(transformedData);

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
  const handleToggleRain = useCallback((enabled: boolean) => {
    setIsRainActive(enabled);
  }, []);

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
    const pulseSpeed = FLOOD_PULSE_SPEED_HZ;
    const pulseAmount = FLOOD_PULSE_AMOUNT;

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
    const flyDuration = CAMERA_FLY_DURATION_MS;
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
      <main
        className="relative flex min-h-screen flex-col overflow-hidden"
        style={{ backgroundColor: '#1e1e1e' }}
      >
        <div
          className="relative h-screen w-full"
          style={{
            pointerEvents: isSimulationActive ? 'auto' : 'none',
            backgroundColor: '#1e1e1e',
          }}
        >
          <div
            ref={mapContainerRef}
            className="h-full w-full"
            style={{ backgroundColor: '#1e1e1e' }}
          />

          {/* Grey overlay when simulation is not active */}
          {!isSimulationActive && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center"
              style={{ backgroundColor: '#1e1e1e' }}
            >
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
