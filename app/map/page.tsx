"use client";

import { ControlPanel } from "@/components/control-panel";
import { CameraControls } from "@/components/camera-controls";
import {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
  Suspense,
} from "react";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  DEFAULT_STYLE,
  MAP_BOUNDS,
  MAPBOX_ACCESS_TOKEN,
  OVERLAY_CONFIG,
  LAYER_IDS,
  MAP_STYLES,
  getLinePaintConfig,
  getCirclePaintConfig,
  getLineHitAreaPaintConfig,
  getCircleHitAreaPaintConfig,
  getFloodHazardPaintConfig,
  getMandauePopulationPaintConfig,
  CAMERA_ANIMATION,
} from "@/lib/map/config";
import mapboxgl from "mapbox-gl";
import { useInlets } from "@/hooks/useInlets";
import { useOutlets } from "@/hooks/useOutlets";
import { useDrain } from "@/hooks/useDrain";
import { usePipes } from "@/hooks/usePipes";
import { useSidebar } from "@/components/ui/sidebar";
import type {
  Inlet,
  Outlet,
  Drain,
  Pipe,
  DatasetType,
} from "@/components/control-panel/types";
import ReactDOM from "react-dom/client";
import { ReportBubble, type ReportBubbleRef } from "@/components/report-bubble";
import { useSearchParams, useRouter } from "next/navigation";
import { getreportCategoryCount } from "@/lib/supabase/report";
import "mapbox-gl/dist/mapbox-gl.css";
import { useReports } from "@/components/context/ReportProvider";

function MapPageContent() {
  const { setOpen, isMobile, setOpenMobile, open } = useSidebar();
  const {
    latestReports: reports, // Use latestReports from context for map bubbles
    allReports: allReportsData, // Use allReports from context for history
    isRefreshingReports,
    refreshReports: onRefreshReports, // Use refresh function from context
  } = useReports();
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedFloodScenario, setSelectedFloodScenario] =
    useState<string>("5YR");
  const [overlayVisibility, setOverlayVisibility] = useState({
    "man_pipes-layer": true,
    "storm_drains-layer": true,
    "inlets-layer": true,
    "outlets-layer": true,
    "reports-layer": true,
    "flood_hazard-layer": true,
    "mandaue_population-layer": true,
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

  const reportPopupsRef = useRef<mapboxgl.Popup[]>([]);

  const layerIds = useMemo(() => LAYER_IDS, []);

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams.get("activetab") || "overlays";

  const [controlPanelTab, setControlPanelTab] = useState<string>(initialTab);

  useEffect(() => {
    const tab = searchParams.get("activetab") || "overlays";
    setControlPanelTab(tab);
  }, [searchParams]);

  const dataConsumerTabs = ["report", "simulations", "admin"];

  // Auto-close sidebar when map page loads (only once on mount)
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [controlPanelDataset, setControlPanelDataset] =
    useState<DatasetType>("inlets");

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
  };

  const handleFloodScenarioChange = (scenarioId: string) => {
    // console.log(`Switching to ${scenarioId} flood hazard...`);

    if (!mapRef.current) {
      console.error("Map not ready");
      return;
    }

    setSelectedFloodScenario(scenarioId);

    const source = mapRef.current.getSource(
      "flood_hazard"
    ) as mapboxgl.GeoJSONSource;

    if (source) {
      const dataUrl = `/flood-hazard/${scenarioId} Flood Hazard.json`;
      // console.log(`Loading: ${dataUrl}`);

      source.setData(dataUrl);

      // Verify the switch worked
      mapRef.current.once("sourcedata", (e) => {
        if (e.sourceId === "flood_hazard" && e.isSourceLoaded) {
          const features = mapRef.current?.querySourceFeatures("flood_hazard");
          console.log(
            `Loaded ${scenarioId}: ${features?.length || 0} features`
          );
        }
      });
    } else {
      console.error("flood_hazard source not found");
      console.log(
        "Available sources:",
        Object.keys(mapRef.current.getStyle().sources)
      );
    }
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

  // Toggle report popups visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const isVisible = overlayVisibility["reports-layer"];
    const popups = reportPopupsRef.current;

    popups.forEach((popup) => {
      if (isVisible) {
        if (!popup.isOpen()) {
          popup.addTo(map);
        }
      } else {
        popup.remove();
      }
    });
  }, [overlayVisibility]);

  useEffect(() => {
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    // Only initialize map after sidebar is closed to ensure proper sizing
    if (mapContainerRef.current && !mapRef.current && !open) {
      try {
        // Check WebGL support before initializing map
        if (!mapboxgl.supported()) {
          setMapError(
            "WebGL is not supported on this browser. Please use a modern browser with WebGL support."
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

        const addCustomLayers = () => {
          if (!map.getSource("mapbox-dem")) {
            map.addSource("mapbox-dem", {
              type: "raster-dem",
              url: "mapbox://mapbox.mapbox-terrain-dem-v1",
              tileSize: 512,
              maxzoom: 14,
            });
            map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
          }

          if (!map.getLayer("3d-buildings")) {
            map.addLayer(
              {
                id: "3d-buildings",
                source: "composite",
                "source-layer": "building",
                filter: ["==", "extrude", "true"],
                type: "fill-extrusion",
                minzoom: 15,
                paint: {
                  "fill-extrusion-color": "#aaa",
                  "fill-extrusion-height": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    15,
                    0,
                    15.05,
                    ["get", "height"],
                  ],
                  "fill-extrusion-base": ["get", "min_height"],
                  "fill-extrusion-opacity": 0.6,
                },
              },
              "waterway-label"
            );
          }

          if (!map.getSource("flood_hazard")) {
            // console.log("🔵 Adding flood_hazard source and layer...");

            map.addSource("flood_hazard", {
              type: "geojson",
              data: `/flood-hazard/${selectedFloodScenario} Flood Hazard.json`,
            });

            map.addLayer({
              id: "flood_hazard-layer",
              type: "fill",
              source: "flood_hazard",
              paint: getFloodHazardPaintConfig(),
            });
          }

          if (!map.getSource("mandaue_population")) {
            map.addSource("mandaue_population", {
              type: "geojson",
              data: "/overlays/mandaue_population.geojson",
            });

            map.addLayer({
              id: "mandaue_population-layer",
              type: "fill",
              source: "mandaue_population",
              paint: getMandauePopulationPaintConfig(),
            });
          }

          if (!map.getSource("man_pipes")) {
            map.addSource("man_pipes", {
              type: "geojson",
              data: "/drainage/man_pipes.geojson",
              promoteId: "Name",
            });
            // Add invisible hit area layer first (rendered below)
            map.addLayer({
              id: "man_pipes-hit-layer",
              type: "line",
              source: "man_pipes",
              paint: getLineHitAreaPaintConfig("man_pipes"),
            });
            // Add visible layer on top
            map.addLayer({
              id: "man_pipes-layer",
              type: "line",
              source: "man_pipes",
              paint: getLinePaintConfig("man_pipes"),
            });
          }

          if (!map.getSource("storm_drains")) {
            map.addSource("storm_drains", {
              type: "geojson",
              data: "/drainage/storm_drains.geojson",
              promoteId: "In_Name",
            });
            // Add invisible hit area layer first (rendered below)
            map.addLayer({
              id: "storm_drains-hit-layer",
              type: "circle",
              source: "storm_drains",
              paint: getCircleHitAreaPaintConfig("storm_drains"),
            });
            // Add visible layer on top
            map.addLayer({
              id: "storm_drains-layer",
              type: "circle",
              source: "storm_drains",
              paint: getCirclePaintConfig("storm_drains"),
            });
          }

          if (!map.getSource("inlets")) {
            map.addSource("inlets", {
              type: "geojson",
              data: "/drainage/inlets.geojson",
              promoteId: "In_Name",
            });
            // Add invisible hit area layer first (rendered below)
            map.addLayer({
              id: "inlets-hit-layer",
              type: "circle",
              source: "inlets",
              paint: getCircleHitAreaPaintConfig("inlets"),
            });
            // Add visible layer on top
            map.addLayer({
              id: "inlets-layer",
              type: "circle",
              source: "inlets",
              paint: getCirclePaintConfig("inlets"),
            });
          }

          if (!map.getSource("outlets")) {
            map.addSource("outlets", {
              type: "geojson",
              data: "/drainage/outlets.geojson",
              promoteId: "Out_Name",
            });
            // Add invisible hit area layer first (rendered below)
            map.addLayer({
              id: "outlets-hit-layer",
              type: "circle",
              source: "outlets",
              paint: getCircleHitAreaPaintConfig("outlets"),
            });
            // Add visible layer on top
            map.addLayer({
              id: "outlets-layer",
              type: "circle",
              source: "outlets",
              paint: getCirclePaintConfig("outlets"),
            });
          }
        };

        map.on("load", addCustomLayers);
        map.on("style.load", addCustomLayers);

        // Move click handler inside here where map is defined
        map.on("click", (e) => {
          //console.log("=== Map Click Debug ===");
          //console.log("Current tab from ref:", currentTabRef.current);
          //console.log("Data consumer tabs:", dataConsumerTabs);

          // Query hit area layers for better click detection
          const validHitLayers = [
            "inlets-hit-layer",
            "outlets-hit-layer",
            "storm_drains-hit-layer",
            "man_pipes-hit-layer",
          ].filter((id) => map.getLayer(id));

          if (!validHitLayers.length) {
            // console.log("No valid hit area layers found");
            return;
          }

          const features = map.queryRenderedFeatures(e.point, {
            layers: validHitLayers,
          });

          if (!features.length) {
            //console.log("No features found at click point");
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
          //console.log("Should keep current tab?", shouldKeepTab);

          // Map hit layer IDs to their corresponding data
          switch (feature.layer.id) {
            case "man_pipes-hit-layer": {
              const pipe = pipesRef.current.find((p) => p.id === props.Name);
              if (pipe) {
                //console.log("Selected pipe:", pipe.id);
                handleSelectPipe(pipe);
                if (!shouldKeepTab) {
                  handleTabChange("stats");
                }
              }
              break;
            }
            case "inlets-hit-layer": {
              const inlet = inletsRef.current.find(
                (i) => i.id === props.In_Name
              );
              if (inlet) {
                handleSelectInlet(inlet);
                if (!shouldKeepTab) {
                  handleTabChange("stats");
                }
              }
              break;
            }
            case "outlets-hit-layer": {
              const outlet = outletsRef.current.find(
                (o) => o.id === props.Out_Name
              );
              if (outlet) {
                handleSelectOutlet(outlet);
                if (!shouldKeepTab) {
                  handleTabChange("stats");
                }
              }
              break;
            }
            case "storm_drains-hit-layer": {
              const drain = drainsRef.current.find(
                (d) => d.id === props.In_Name
              );
              if (drain) {
                handleSelectDrain(drain);
                if (!shouldKeepTab) {
                  handleTabChange("stats");
                }
              }
              break;
            }
          }
        });

        // Cursor style - use hit area layers for better cursor feedback
        const hitAreaLayerIds = [
          "inlets-hit-layer",
          "outlets-hit-layer",
          "storm_drains-hit-layer",
          "man_pipes-hit-layer",
        ];

        hitAreaLayerIds.forEach((layerId) => {
          map.on("mouseenter", layerId, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", layerId, () => {
            map.getCanvas().style.cursor = "";
          });
        });
      } catch (error) {
        console.error("Failed to initialize map:", error);
        setMapError(
          "Failed to initialize map. Please refresh the page or try a different browser."
        );
        return;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerIds, open]);

  // Handler for clicking history button on report bubble
  const handleReportHistoryClick = useCallback(
    (category: string, componentId: string) => {
      // Find the matching component based on category
      switch (category) {
        case "inlets": {
          const inlet = inlets.find((i) => i.id === componentId);
          if (inlet) {
            setSelectedInlet(inlet);
            setSelectedOutlet(null);
            setSelectedPipe(null);
            setSelectedDrain(null);
            setControlPanelTab("admin");
          }
          break;
        }
        case "outlets": {
          const outlet = outlets.find((o) => o.id === componentId);
          if (outlet) {
            setSelectedOutlet(outlet);
            setSelectedInlet(null);
            setSelectedPipe(null);
            setSelectedDrain(null);
            setControlPanelTab("admin");
          }
          break;
        }
        case "man_pipes": {
          const pipe = pipes.find((p) => p.id === componentId);
          if (pipe) {
            setSelectedPipe(pipe);
            setSelectedInlet(null);
            setSelectedOutlet(null);
            setSelectedDrain(null);
            setControlPanelTab("admin");
          }
          break;
        }
        case "storm_drains": {
          const drain = drains.find((d) => d.id === componentId);
          if (drain) {
            setSelectedDrain(drain);
            setSelectedInlet(null);
            setSelectedOutlet(null);
            setSelectedPipe(null);
            setControlPanelTab("admin");
          }
          break;
        }
      }
    },
    [inlets, outlets, pipes, drains]
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !reports || reports.length === 0) return;

    // Remove old popups
    reportPopupsRef.current.forEach((popup) => popup.remove());
    reportPopupsRef.current = [];

    const reportBubbleRefs: Array<ReportBubbleRef | null> = [];

    const coordinateCounts = new Map<string, number>();
    reports.forEach((report) => {
      const key = JSON.stringify(report.coordinates);
      coordinateCounts.set(key, (coordinateCounts.get(key) || 0) + 1);
    });

    reports.forEach((report, index) => {
      const container = document.createElement("div");
      const root = ReactDOM.createRoot(container);

      const popup = new mapboxgl.Popup({
        maxWidth: "320px",
        closeButton: false,
        className: "no-bg-popup",
        closeOnClick: false,
      })
        .setLngLat(report.coordinates)
        .setDOMContent(container)
        .addTo(map);

      reportPopupsRef.current.push(popup);

      const handleOpenBubble = () => {
        reportBubbleRefs.forEach((ref, i) => {
          if (i !== index && ref) ref.close();
        });
      };

      root.render(
        <ReportBubble
          ref={(ref) => {
            reportBubbleRefs[index] = ref;
          }}
          reportSize={getreportCategoryCount(
            report.category,
            report.componentId
          )}
          report={report}
          map={map}
          coordinates={report.coordinates}
          onOpen={handleOpenBubble}
          onHistoryClick={() =>
            handleReportHistoryClick(report.category, report.componentId)
          }
        />
      );
    });
  }, [reports, handleReportHistoryClick]);

  useEffect(() => {
    if (mapRef.current) {
      layerIds.forEach((layerId) => {
        if (mapRef.current?.getLayer(layerId)) {
          const isVisible =
            overlayVisibility[layerId as keyof typeof overlayVisibility];
          mapRef.current.setLayoutProperty(
            layerId,
            "visibility",
            isVisible ? "visible" : "none"
          );

          // Also control the corresponding hit area layer visibility
          const hitLayerId = layerId.replace("-layer", "-hit-layer");
          if (mapRef.current?.getLayer(hitLayerId)) {
            mapRef.current.setLayoutProperty(
              hitLayerId,
              "visibility",
              isVisible ? "visible" : "none"
            );
          }
        }
      });
    }
  }, [overlayVisibility, layerIds]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();
  const handleResetPosition = () =>
    mapRef.current?.flyTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });

  const handleChangeStyle = () => {
    const currentStyle = mapRef.current?.getStyle().name;
    let newStyle = "";

    if (currentStyle === "Mapbox Streets") {
      newStyle = MAP_STYLES.SATELLITE;
    } else if (currentStyle === "Mapbox Satellite Streets") {
      newStyle = MAP_STYLES.STREETS;
    }

    if (newStyle) {
      mapRef.current?.setStyle(newStyle);
    }
  };

  const handleOverlayToggle = (layerId: string) => {
    setOverlayVisibility((prev) => ({
      ...prev,
      [layerId]: !prev[layerId as keyof typeof prev],
    }));
  };

  const overlayData = OVERLAY_CONFIG.map((config) => ({
    ...config,
    visible: overlayVisibility[config.id as keyof typeof overlayVisibility],
  }));

  const handleToggleAllOverlays = () => {
    const someVisible = Object.values(overlayVisibility).some(Boolean);

    const updated: typeof overlayVisibility = {
      "man_pipes-layer": !someVisible,
      "storm_drains-layer": !someVisible,
      "inlets-layer": !someVisible,
      "outlets-layer": !someVisible,
      "reports-layer": !someVisible,
      "flood_hazard-layer": !someVisible,
    };

    setOverlayVisibility(updated);
  };

  const someVisible = Object.values(overlayVisibility).some(Boolean);

  // Handler for the back button in control panel
  const handleControlPanelBack = () => {
    clearSelections();
    setControlPanelTab("stats");
  };

  const handleSelectInlet = (inlet: Inlet) => {
    if (!mapRef.current) return;
    const [lng, lat] = inlet.coordinates;

    // Clear any previous selections first
    clearSelections();

    // Set the new selection state for control panel
    setSelectedInlet(inlet);
    // Remove the tab switching from here since it's handled in the click handler
    setControlPanelDataset("inlets");

    // Set new map feature state
    mapRef.current.setFeatureState(
      { source: "inlets", id: inlet.id },
      { selected: true }
    );
    setSelectedFeature({
      id: inlet.id,
      source: "inlets",
      layer: "inlets-layer",
    });

    // Fly to the location on the map with silky smooth animation
    mapRef.current.flyTo({
      center: [lng, lat],
      zoom: CAMERA_ANIMATION.targetZoom,
      speed: CAMERA_ANIMATION.speed,
      curve: CAMERA_ANIMATION.curve,
      essential: CAMERA_ANIMATION.essential,
      easing: CAMERA_ANIMATION.easing,
    });
  };

  const handleSelectOutlet = (outlet: Outlet) => {
    if (!mapRef.current) return;
    const [lng, lat] = outlet.coordinates;

    // Clear any previous selections first
    clearSelections();

    // Set the new selection state for control panel
    setSelectedOutlet(outlet);
    // Remove the tab switching from here since it's handled in the click handler
    setControlPanelDataset("outlets");

    // Set new map feature state
    mapRef.current.setFeatureState(
      { source: "outlets", id: outlet.id },
      { selected: true }
    );
    setSelectedFeature({
      id: outlet.id,
      source: "outlets",
      layer: "outlets-layer",
    });

    // Fly to the location on the map with silky smooth animation
    mapRef.current.flyTo({
      center: [lng, lat],
      zoom: CAMERA_ANIMATION.targetZoom,
      speed: CAMERA_ANIMATION.speed,
      curve: CAMERA_ANIMATION.curve,
      essential: CAMERA_ANIMATION.essential,
      easing: CAMERA_ANIMATION.easing,
    });
  };

  const handleSelectDrain = (drain: Drain) => {
    if (!mapRef.current) return;
    const [lng, lat] = drain.coordinates;

    // Clear any previous selections first
    clearSelections();

    // Set the new selection state for control panel
    setSelectedDrain(drain);
    // Remove the tab switching from here since it's handled in the click handler
    setControlPanelDataset("storm_drains");

    // Set new map feature state
    mapRef.current.setFeatureState(
      { source: "storm_drains", id: drain.id },
      { selected: true }
    );
    setSelectedFeature({
      id: drain.id,
      source: "storm_drains",
      layer: "storm_drains-layer",
    });

    // Fly to the location on the map with silky smooth animation
    mapRef.current.flyTo({
      center: [lng, lat],
      zoom: CAMERA_ANIMATION.targetZoom,
      speed: CAMERA_ANIMATION.speed,
      curve: CAMERA_ANIMATION.curve,
      essential: CAMERA_ANIMATION.essential,
      easing: CAMERA_ANIMATION.easing,
    });
  };

  const handleSelectPipe = (pipe: Pipe) => {
    if (!mapRef.current) return;
    if (!pipe.coordinates || pipe.coordinates.length === 0) return;

    // Clear any previous selections first
    clearSelections();

    // Set the new selection state for control panel
    setSelectedPipe(pipe);
    // Remove the tab switching from here since it's handled in the click handler
    setControlPanelDataset("man_pipes");

    // Set new map feature state
    mapRef.current.setFeatureState(
      { source: "man_pipes", id: pipe.id },
      { selected: true }
    );
    setSelectedFeature({
      id: pipe.id,
      source: "man_pipes",
      layer: "man_pipes-layer",
    });

    // Calculate midpoint for camera animation
    const midIndex = Math.floor(pipe.coordinates.length / 2);
    const midpoint = pipe.coordinates[midIndex];

    // Fly to the location on the map with silky smooth animation
    mapRef.current.flyTo({
      center: midpoint,
      zoom: CAMERA_ANIMATION.targetZoom,
      speed: CAMERA_ANIMATION.speed,
      curve: CAMERA_ANIMATION.curve,
      essential: CAMERA_ANIMATION.essential,
      easing: CAMERA_ANIMATION.easing,
    });
  };

  // Add a ref to track current tab
  const currentTabRef = useRef(initialTab);

  // Update the tab change handler
  const handleTabChange = (tab: string) => {
    //console.log("Tab changing from:", currentTabRef.current, "to:", tab);
    setControlPanelTab(tab);
    currentTabRef.current = tab;
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("activetab", tab);
    router.replace(`?${newParams.toString()}`);
  };

  // Update the useEffect for URL sync
  useEffect(() => {
    const tab = searchParams.get("activetab") || "overlays";
    currentTabRef.current = tab;
    setControlPanelTab(tab);
  }, [searchParams]);

  return (
    <>
      <main className="relative min-h-screen flex flex-col bg-blue-200">
        <div className="w-full h-screen" ref={mapContainerRef}>
          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/95 z-50">
              <div className="text-center p-8 max-w-md">
                <h2 className="text-2xl font-bold mb-4">
                  Map Initialization Error
                </h2>
                <p className="text-muted-foreground mb-4">{mapError}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
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
          selectedInlet={selectedInlet}
          selectedOutlet={selectedOutlet}
          selectedPipe={selectedPipe}
          selectedDrain={selectedDrain}
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
          selectedFloodScenario={selectedFloodScenario}
          onChangeFloodScenario={handleFloodScenarioChange}
          reports={reports}
          onRefreshReports={onRefreshReports}
          isRefreshingReports={isRefreshingReports}
          allReportsData={allReportsData} // Pass all reports data to ControlPanel
        />
        <CameraControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetPosition={handleResetPosition}
          onChangeStyle={handleChangeStyle}
        />
      </main>
    </>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<div className="w-full h-screen bg-blue-200" />}>
      <MapPageContent />
    </Suspense>
  );
}
