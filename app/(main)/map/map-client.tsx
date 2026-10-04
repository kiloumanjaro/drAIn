'use client';

import { ControlPanel } from '@/components/control-panel';
import { CameraControls } from '@/components/map/camera-controls';
import {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
  Suspense,
} from 'react';
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  DEFAULT_STYLE,
  MAP_BOUNDS,
  MAPBOX_ACCESS_TOKEN,
  LAYER_IDS,
  MAP_STYLES,
} from '@/lib/map/config';
import mapboxgl from 'mapbox-gl';
import {
  useInlets,
  useOutlets,
  usePipes,
  useDrains,
} from '@/lib/query/hooks/use-drainage-data';
import { useLatestRef } from '@/hooks/use-latest-ref';
import {
  addMapLayers,
  floodHazardDataUrl,
  registerFloodProneHover,
} from '@/lib/map/layers';
import {
  applyFloodProneVisibility,
  applyOverlayVisibility,
} from '@/lib/map/visibility';
import {
  componentAtHitLayer,
  findComponent,
} from '@/lib/map/component-selection';
import { useSidebar } from '@/components/ui/sidebar';
import { useSearchParams, useRouter } from 'next/navigation';
import { useReports } from '@/components/context/report-provider';
import { toast } from 'sonner';
import { useComponentSelection } from './use-component-selection';
import { useOverlayToggles } from './use-overlay-toggles';
import { usePopulationLayer } from './use-population-layer';
import { useReportBubbles } from './use-report-bubbles';

/** The drainage hooks' fallback while loading: one array, not a new one per render. */
const NO_ITEMS: never[] = [];

function MapPageContent() {
  const { setOpen, isMobile, setOpenMobile, open } = useSidebar();
  const {
    latestReports: reports, // Use latestReports from context for map bubbles
    isRefreshingReports,
    refreshReports: onRefreshReports, // Use refresh function from context
  } = useReports();
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedFloodScenario, setSelectedFloodScenario] =
    useState<string>('5YR');
  const [isFloodScenarioLoading, setIsFloodScenarioLoading] = useState(false);
  const {
    overlayVisibility,
    floodProneVisibility,
    overlayData,
    floodProneAreasData,
    someVisible,
    handleOverlayToggle,
    handleToggleFloodProneArea,
    handleToggleAllOverlays,
  } = useOverlayToggles();

  const overlayVisibilityRef = useLatestRef(overlayVisibility);
  const { registerPopulationLayer, clearPopulationLayerSelection } =
    usePopulationLayer(overlayVisibilityRef);
  const floodProneVisibilityRef = useLatestRef(floodProneVisibility);
  const selectedFloodScenarioRef = useLatestRef(selectedFloodScenario);

  const layerIds = useMemo(() => LAYER_IDS, []);
  // True once the map has loaded, so effects that draw on it can wait for it.
  const [mapReady, setMapReady] = useState(false);

  // Load data from hooks with TanStack Query. The fallback is one shared
  // empty array: a fresh `[]` each render made every callback built on
  // these change on every render.
  const { data: inlets = NO_ITEMS, error: inletsError } = useInlets();

  const { data: outlets = NO_ITEMS, error: outletsError } = useOutlets();

  const { data: pipes = NO_ITEMS, error: pipesError } = usePipes();

  const { data: drains = NO_ITEMS, error: drainsError } = useDrains();

  const drainageDataError =
    inletsError || outletsError || pipesError || drainsError;

  // Handle drainage data errors
  useEffect(() => {
    if (drainageDataError) {
      toast.error(`Failed to load drainage data: ${drainageDataError.message}`);
    }
  }, [drainageDataError]);

  // Selection state for control panel detail view
  const {
    selected,
    dataset: controlPanelDataset,
    setDataset: setControlPanelDataset,
    clearSelections,
    selectComponent,
    showComponent,
    handleSelectInlet,
    handleSelectOutlet,
    handleSelectDrain,
    handleSelectPipe,
  } = useComponentSelection(mapRef);

  // Control panel state
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams.get('activetab') || 'overlays';

  const [controlPanelTab, setControlPanelTab] = useState<string>(initialTab);

  const dataConsumerTabs = ['report', 'simulations', 'admin'];

  // Auto-close sidebar when map page loads (only once on mount)
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle URL parameters for component selection
  useEffect(() => {
    const componentId = searchParams.get('component');
    const componentType = searchParams.get('type');

    if (!componentId || !componentType) return;
    if (!mapRef.current) return;

    // Wait a bit for data to load
    const timer = setTimeout(() => {
      const component = findComponent(
        { inlets, outlets, storm_drains: drains, man_pipes: pipes },
        componentType,
        componentId
      );
      if (component) {
        selectComponent(component);
        handleTabChange('admin');
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, inlets, outlets, pipes, drains]);

  const handleFloodScenarioChange = (scenarioId: string) => {
    if (!mapRef.current) {
      console.error('Map not ready');
      return;
    }

    setIsFloodScenarioLoading(true);
    setSelectedFloodScenario(scenarioId);

    const source = mapRef.current.getSource(
      'flood_hazard'
    ) as mapboxgl.GeoJSONSource;

    if (source) {
      const dataUrl = floodHazardDataUrl(scenarioId);

      source.setData(dataUrl);

      mapRef.current.once('idle', () => {
        setIsFloodScenarioLoading(false);
      });
    } else {
      console.error('flood_hazard source not found');
      setIsFloodScenarioLoading(false);
    }
  };

  // The Mapbox click handler is registered once, so it must read drainage
  // data through refs rather than closing over it.
  const inletsRef = useLatestRef(inlets);
  const outletsRef = useLatestRef(outlets);
  const pipesRef = useLatestRef(pipes);
  const drainsRef = useLatestRef(drains);

  useEffect(() => {
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    // Only initialize map after sidebar is closed to ensure proper sizing
    if (mapContainerRef.current && !mapRef.current && !open) {
      try {
        // Check WebGL support before initializing map
        if (!mapboxgl.supported()) {
          setMapError(
            'WebGL is not supported on this browser. Please use a modern browser with WebGL support.'
          );
          return;
        }

        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: DEFAULT_STYLE,
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          maxBounds: MAP_BOUNDS,
          pitch: 60,
          bearing: -17.6,
          attributionControl: false, // Disable default attribution
        });

        mapRef.current = map;

        // Read through refs: after a style switch this runs long after the
        // first render, and used to rebuild the layers with its 5YR scenario.
        // The layers also come back with their default visibility, so the
        // switches are applied again; without that, layers switched off
        // reappeared while their switches still read off.
        const addCustomLayers = () => {
          addMapLayers(map, {
            floodScenario: selectedFloodScenarioRef.current,
          });
          applyOverlayVisibility(map, layerIds, overlayVisibilityRef.current);
          applyFloodProneVisibility(map, floodProneVisibilityRef.current);
        };

        map.on('load', addCustomLayers);
        map.on('load', () => setMapReady(true));
        map.on('style.load', addCustomLayers);
        registerFloodProneHover(map);

        // Move click handler inside here where map is defined
        map.on('click', (e) => {
          // Query hit area layers for better click detection
          const validHitLayers = [
            'inlets-hit-layer',
            'outlets-hit-layer',
            'storm_drains-hit-layer',
            'man_pipes-hit-layer',
          ].filter((id) => map.getLayer(id));

          if (!validHitLayers.length) {
            return;
          }

          const features = map.queryRenderedFeatures(e.point, {
            layers: validHitLayers,
          });

          if (!features.length) {
            clearSelections();
            return;
          }

          const feature = features[0];
          const props = feature.properties || {};
          if (!feature.layer) return;

          // Use currentTabRef instead of controlPanelTab
          const shouldKeepTab = dataConsumerTabs.includes(
            currentTabRef.current
          );

          const component = componentAtHitLayer(
            {
              inlets: inletsRef.current,
              outlets: outletsRef.current,
              storm_drains: drainsRef.current,
              man_pipes: pipesRef.current,
            },
            feature.layer.id,
            props
          );
          if (component) {
            selectComponent(component);
            if (!shouldKeepTab) {
              handleTabChange('stats');
            }
          }
        });

        // Cursor style - use hit area layers for better cursor feedback
        const hitAreaLayerIds = [
          'inlets-hit-layer',
          'outlets-hit-layer',
          'storm_drains-hit-layer',
          'man_pipes-hit-layer',
        ];

        hitAreaLayerIds.forEach((layerId) => {
          map.on('mouseenter', layerId, () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', layerId, () => {
            map.getCanvas().style.cursor = '';
          });
        });

        registerPopulationLayer(map);
      } catch (error) {
        console.error('Failed to initialize map:', error);
        setMapError(
          'Failed to initialize map. Please refresh the page or try a different browser.'
        );
        return;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerIds, open]);

  // Handler for clicking history button on report bubble
  const handleReportHistoryClick = useCallback(
    (category: string, componentId: string) => {
      const component = findComponent(
        { inlets, outlets, storm_drains: drains, man_pipes: pipes },
        category,
        componentId
      );
      if (component) {
        showComponent(component);
        setControlPanelTab('admin');
      }
    },
    [inlets, outlets, pipes, drains, showComponent]
  );

  useReportBubbles({
    mapRef,
    mapReady,
    reports,
    visible: overlayVisibility['reports-layer'],
    onHistoryClick: handleReportHistoryClick,
  });

  useEffect(() => {
    if (mapRef.current) {
      applyOverlayVisibility(mapRef.current, layerIds, overlayVisibility);

      const populationVisible = overlayVisibility['mandaue_population-layer'];

      // Clear population layer selection when toggled off
      if (!populationVisible) {
        clearPopulationLayerSelection(mapRef.current);
      }
    }
  }, [overlayVisibility, layerIds, clearPopulationLayerSelection]);

  useEffect(() => {
    if (mapRef.current) {
      applyFloodProneVisibility(mapRef.current, floodProneVisibility);
    }
  }, [floodProneVisibility]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleResetPosition = () =>
    mapRef.current?.flyTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });

  const handleChangeStyle = () => {
    const currentStyle = mapRef.current?.getStyle().name;
    let newStyle = '';

    if (currentStyle === 'Mapbox Streets') {
      newStyle = MAP_STYLES.SATELLITE;
    } else if (currentStyle === 'Mapbox Satellite Streets') {
      newStyle = MAP_STYLES.STREETS;
    }

    if (newStyle) {
      mapRef.current?.setStyle(newStyle);
    }
  };

  // Handler for the back button in control panel
  const handleControlPanelBack = () => {
    clearSelections();
    setControlPanelTab('stats');
  };

  // Add a ref to track current tab
  const currentTabRef = useRef(initialTab);

  // Update the tab change handler
  const handleTabChange = useCallback(
    (tab: string) => {
      setControlPanelTab(tab);
      currentTabRef.current = tab;
      // From the address bar, not this render's searchParams: the map's click
      // handler keeps the first render's copy of this function, and rebuilt
      // the URL from that render's parameters.
      const newParams = new URLSearchParams(window.location.search);
      newParams.set('activetab', tab);
      router.replace(`?${newParams.toString()}`);
    },
    [router]
  );

  // Update the useEffect for URL sync
  useEffect(() => {
    const tab = searchParams.get('activetab') || 'overlays';
    currentTabRef.current = tab;
    setControlPanelTab(tab);
  }, [searchParams]);

  // Declared last, so on unmount it runs after the effects above have taken
  // their popups and layers off the map. Without it every visit to the map
  // left a WebGL context and its listeners behind.
  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <>
      {/* div, not main: SidebarInset is already the main landmark */}
      <div className="relative flex min-h-screen flex-col bg-[#e0e0d1]">
        <div className="h-screen w-full" ref={mapContainerRef}>
          {mapError && (
            <div className="bg-background/95 absolute inset-0 z-50 flex items-center justify-center">
              <div className="max-w-md p-8 text-center">
                <h2 className="mb-4 text-2xl font-bold">
                  Map Initialization Error
                </h2>
                <p className="text-muted-foreground mb-4">{mapError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2"
                >
                  Reload Page
                </button>
              </div>
            </div>
          )}
        </div>
        <ControlPanel
          activeTab={controlPanelTab}
          dataset={controlPanelDataset}
          selectedInlet={selected.inlets}
          selectedOutlet={selected.outlets}
          selectedPipe={selected.man_pipes}
          selectedDrain={selected.storm_drains}
          onTabChange={handleTabChange}
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
          floodProneAreas={floodProneAreasData}
          onToggleFloodProneArea={handleToggleFloodProneArea}
          selectedFloodScenario={selectedFloodScenario}
          onChangeFloodScenario={handleFloodScenarioChange}
          onRefreshReports={onRefreshReports}
          isRefreshingReports={isRefreshingReports}
          isFloodScenarioLoading={isFloodScenarioLoading}
        />
        <CameraControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetPosition={handleResetPosition}
          onChangeStyle={handleChangeStyle}
        />
      </div>
    </>
  );
}

/**
 * Top-level `/map` route. Wraps the imperative Mapbox content in a Suspense
 * boundary so the page can read URL search params (`useSearchParams`) without
 * forcing the whole tree into client-side rendering during navigation.
 */
export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-[#e0e0d1]">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-gray-300"></div>
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-t-blue-600"></div>
          </div>
        </div>
      }
    >
      <MapPageContent />
    </Suspense>
  );
}
