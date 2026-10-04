'use client';

import { ControlPanel } from '@/components/control-panel';
import { CameraControls } from '@/components/map/camera-controls';
import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/context/auth-provider';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '@/lib/map/config';

import { enableRain, disableRain } from '@/lib/map/effects/rain-utils';
import { enableFlood3D } from '@/lib/map/effects/flood-3d-utils';
import { applyVulnerabilityColors as applyVulnerabilityColorsOnMap } from '@/lib/map/effects/vulnerability-colors';
import type { SimulationMapHandlers } from '@/lib/map/simulation-interactions';
import {
  focusMapFeature as focusFeatureOnMap,
  type SelectedFeature,
} from '@/lib/map/focus-feature';

import {
  SIMULATION_LAYER_IDS,
  LAYER_COLORS,
  CAMERA_ANIMATION,
} from '@/lib/map/simulation-config';
import type mapboxgl from 'mapbox-gl';
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
import { parseNodeId } from './page.helpers';
import { SimulationOverlays } from './simulation-overlays';
import { useFloodPropagationAnimation } from './use-flood-propagation-animation';
import { useNodeSlideshow } from './use-node-slideshow';
import { useParameterPanels } from './use-parameter-panels';
import { useSimulationMap } from './use-simulation-map';
import { useVulnerabilityTables } from './use-vulnerability-tables';

import { useSidebar } from '@/components/ui/sidebar';
import { toast } from 'sonner';
import { useLatestRef } from '@/hooks/use-latest-ref';
import type { NodeDetails } from '@/types/simulation';

const FLOOD_3D_OPTIONS = {
  opacity: 0.7,
  animate: true,
  animationDuration: 3000,
};

export default function SimulationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isSimulationActive = searchParams.get('active') === 'true';
  const { setOpen, isMobile, setOpenMobile, open } = useSidebar();
  // Custom runs use the simulation server, which runs nothing for callers
  // who aren't signed in.
  const { session } = useAuth();

  const mapRef = useRef<mapboxgl.Map | null>(null);

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

  // Nodes picked out in a results table
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(
    new Set()
  );

  // What a custom run is made from, and its two parameter panels
  const panels = useParameterPanels();

  // Rain effect state
  const [isRainActive, setIsRainActive] = useState(false); // Start with false, will be set when table is generated
  const [isFloodScenarioLoading, setIsFloodScenarioLoading] = useState(false);
  const {
    isFloodPropagationActive,
    updateFloodPropagation,
    handleToggleFloodPropagation,
    restoreFloodPropagationLayers,
  } = useFloodPropagationAnimation(mapRef);

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

  // The map's click and hover handlers are registered once, when the map is
  // created, so they call this render's functions through a ref (refreshed
  // by an effect further down, after the handlers are defined).
  const mapHandlersRef = useRef<SimulationMapHandlers | null>(null);

  // Close the sidebar once, when the page opens, so the map gets the room.
  // Not again when the viewport changes: that would fight the user.
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { mapContainerRef, mapError, removeMap } = useSimulationMap(mapRef, {
    sidebarOpen: open,
    handlersRef: mapHandlersRef,
    inletsRef,
    outletsRef,
    pipesRef,
    drainsRef,
  });

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

  // Handler for the back button in control panel
  const handleControlPanelBack = () => {
    clearSelections();
    setControlPanelTab('simulations');

    // The heatmap stays visible after the selections are cleared.
    restoreFloodPropagationLayers();
  };

  const focusMapFeature = (
    source: DatasetType,
    id: string,
    center: [number, number]
  ) => {
    const map = mapRef.current;
    if (!map) return;
    setSelectedFeature(
      focusFeatureOnMap(map, source, id, center, CAMERA_ANIMATION)
    );
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
    updateFloodPropagation(data, [...inletsRef.current, ...drainsRef.current]);
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

  const tables = useVulnerabilityTables({
    accessToken: session?.access_token,
    selectedComponentIds: panels.selectedComponentIds,
    componentParams: panels.componentParams,
    pipeParams: panels.pipeParams,
    rainfallParams: panels.rainfallParams,
    onRunStart: panels.closePanels,
    onResults: showVulnerabilityOnMap,
  });

  const slideshow = useNodeSlideshow(mapRef, {
    inletsRef,
    drainsRef,
    activeTableData: tables.activeTableData,
    setTablesMinimized: tables.setTablesMinimized,
  });

  // The flood lines and the heatmap stay on the map, so the results can be
  // looked at with everything else put away.
  const handleClosePopUps = () => {
    tables.dismissTables();
    panels.closePanels();
  };

  // Rain toggle handler
  const handleToggleRain = useCallback((enabled: boolean) => {
    setIsRainActive(enabled);
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

  useEffect(() => {
    mapHandlersRef.current = {
      isSimulationActive,
      onEmptyClick: () => {
        clearSelections();
        setControlPanelTab('simulations');
      },
      selectPipe: handleSelectPipe,
      selectInlet: handleSelectInlet,
      selectOutlet: handleSelectOutlet,
      selectDrain: handleSelectDrain,
    };
  });

  // Declared last, so on unmount the map goes after every other cleanup
  // above has run.
  useEffect(() => removeMap, [removeMap]);

  return (
    <>
      <style>{`
        html, body {
          overflow: hidden !important;
        }
      `}</style>
      {/* div, not main: SidebarInset is already the main landmark */}
      <div
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
          {mapError && (
            <div className="absolute inset-0 z-10 flex items-center justify-center p-8 text-center text-sm text-white/80">
              {mapError}
            </div>
          )}

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
          selectedComponentIds={panels.selectedComponentIds}
          onComponentIdsChange={panels.setSelectedComponentIds}
          selectedPipeIds={panels.selectedPipeIds}
          onPipeIdsChange={panels.setSelectedPipeIds}
          componentParams={panels.componentParams}
          onComponentParamsChange={panels.setComponentParams}
          pipeParams={panels.pipeParams}
          onPipeParamsChange={panels.setPipeParams}
          rainfallParams={panels.rainfallParams}
          onRainfallParamsChange={panels.setRainfallParams}
          showNodePanel={panels.activePanel === 'node'}
          onToggleNodePanel={panels.handleToggleNodePanel}
          showLinkPanel={panels.activePanel === 'link'}
          onToggleLinkPanel={panels.handleToggleLinkPanel}
          onRefreshReports={async () => {}}
          isRefreshingReports={false}
          selectedYear={tables.selectedYear}
          onYearChange={tables.handleYearChange}
          onGenerateTable={tables.handleGenerateTable}
          isLoadingTable={tables.isLoadingTable}
          onCloseTable={tables.handleCloseTable}
          hasTable={!!tables.tableData}
          isTableMinimized={tables.isTableMinimized}
          onToggleTableMinimize={tables.handleToggleTableMinimize}
          onGenerateTable3={tables.handleGenerateTable3}
          isLoadingTable3={tables.isLoadingTable3}
          onCloseTable3={tables.handleCloseTable3}
          hasTable3={!!tables.tableData3}
          isTable3Minimized={tables.isTable3Minimized}
          onToggleTable3Minimize={tables.handleToggleTable3Minimize}
          onOpenNodeSimulation={slideshow.handleOpenNodeSimulation}
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

        <SimulationOverlays
          tables={tables}
          slideshow={slideshow}
          panels={panels}
          inlets={inlets}
          drains={drains}
          onHighlightNodes={handleHighlightNodes}
        />
      </div>
    </>
  );
}
