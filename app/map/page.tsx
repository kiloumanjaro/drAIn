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
import { toast } from "sonner";

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
  const [isFloodScenarioLoading, setIsFloodScenarioLoading] = useState(false);
  const [overlayVisibility, setOverlayVisibility] = useState({
    "man_pipes-layer": true,
    "storm_drains-layer": true,
    "inlets-layer": true,
    "outlets-layer": true,
    "reports-layer": true,
    "flood_hazard-layer": true,
    "mandaue_population-layer": false,
  });

  const [floodProneVisibility, setFloodProneVisibility] = useState({
    downstream_south_area: false,
    mc_briones_highway: false,
    lh_prime_area: false,
    rolling_hills_area: false,
    downstream_east_area: false,
    maguikay_cabancalan_tabok_tingub_butuaonon: false,
    paknaan_butuanon: false,
    basak_pagsabungan: false,
    maguikay_barangay_road: false,
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
  const populationPopupRef = useRef<mapboxgl.Popup | null>(null);
  const clickedPopulationIdRef = useRef<string | null>(null);
  const overlayVisibilityRef = useRef(overlayVisibility);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    setIsFloodScenarioLoading(true);
    setSelectedFloodScenario(scenarioId);

    const source = mapRef.current.getSource(
      "flood_hazard"
    ) as mapboxgl.GeoJSONSource;

    if (source) {
      const dataUrl = `/flood-hazard/${scenarioId} Flood Hazard.json`;
      // console.log(`Loading: ${dataUrl}`);

      source.setData(dataUrl);

      mapRef.current.once("idle", () => {
        setIsFloodScenarioLoading(false);
      });
    } else {
      console.error("flood_hazard source not found");
      setIsFloodScenarioLoading(false);
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

  useEffect(() => {
    overlayVisibilityRef.current = overlayVisibility;
  }, [overlayVisibility]);

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
              data: "/additional-overlays/mandaue_population.geojson",
              promoteId: "name",
            });

            map.addLayer({
              id: "mandaue_population-fill",
              type: "fill",
              source: "mandaue_population",
              layout: {
                visibility: "none",
              },
              paint: {
                "fill-color": "#0288d1",
                "fill-opacity": [
                  "case",
                  ["boolean", ["feature-state", "clicked"], false],
                  0.18,
                  ["boolean", ["feature-state", "hover"], false],
                  0.09,
                  0,
                ],
              },
            });

            map.addLayer({
              id: "mandaue_population-layer",
              type: "line",
              source: "mandaue_population",
              layout: {
                visibility: "none",
              },
              paint: {
                "line-color": "#0288d1",
                "line-width": [
                  "case",
                  ["boolean", ["feature-state", "clicked"], false],
                  2,
                  ["boolean", ["feature-state", "hover"], false],
                  1,
                  0,
                ],
              },
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

          // Add flood prone areas
          const floodProneAreas = [
            {
              id: "downstream_south_area",
              file: "downsteam_south_area.geojson",
              color: "#DC2626",
            },
            {
              id: "mc_briones_highway",
              file: "mc_briones_highway.geojson",
              color: "#059669",
            },
            {
              id: "lh_prime_area",
              file: "lh_prime_area.geojson",
              color: "#0284C7",
            },
            {
              id: "rolling_hills_area",
              file: "rolling_hills_area.geojson",
              color: "#EA580C",
            },
            {
              id: "downstream_east_area",
              file: "downstream_east_area.geojson",
              color: "#0D9488",
            },
            {
              id: "maguikay_cabancalan_tabok_tingub_butuaonon",
              file: "maguikay_cabancalan_tabok_tingub_butuaonon.geojson",
              color: "#D97706",
            },
            {
              id: "paknaan_butuanon",
              file: "paknaan_butuanon.geojson",
              color: "#7C3AED",
            },
            {
              id: "basak_pagsabungan",
              file: "basak_pagsabungan.geojson",
              color: "#0891B2",
            },
            {
              id: "maguikay_barangay_road",
              file: "maguikay_barangay_road.geojson",
              color: "#DB2777",
            },
          ];

          floodProneAreas.forEach((area) => {
            if (!map.getSource(area.id)) {
              map.addSource(area.id, {
                type: "geojson",
                data: `/additional-overlays/flood-prone-area/${area.file}`,
              });

              map.addLayer({
                id: `${area.id}-layer`,
                type: "circle",
                source: area.id,
                layout: {
                  visibility: "none",
                },
                paint: {
                  "circle-radius": 8,
                  "circle-color": area.color,
                  "circle-opacity": 1,
                  "circle-stroke-width": 2,
                  "circle-stroke-color": "#ffffff",
                },
              });
            }
          });

          // Add hover handlers for flood prone areas
          const floodPronePopupRef = { current: null as mapboxgl.Popup | null };

          floodProneAreas.forEach((area) => {
            map.on("mouseenter", `${area.id}-layer`, (e) => {
              map.getCanvas().style.cursor = "pointer";

              if (e.features && e.features.length > 0) {
                const feature = e.features[0];
                const props = feature.properties || {};

                // Remove existing popup if any
                if (floodPronePopupRef.current) {
                  floodPronePopupRef.current.remove();
                }

                // Get feature coordinates (center of the circle)
                const coordinates = (
                  feature.geometry as any
                ).coordinates.slice();

                // Ensure coordinates don't get wrapped around the globe
                while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                  coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                }

                // Create popup container
                const popupContainer = document.createElement("div");
                popupContainer.style.padding = "8px 10px";
                popupContainer.style.whiteSpace = "nowrap";

                // Create content
                const content = document.createElement("div");
                content.innerHTML = `
                  <h3 style="margin: 0; font-size: 12px; font-weight: 600;">
                    ${props.Name || "Flood Prone Area"}
                  </h3>
                `;

                popupContainer.appendChild(content);

                // Create popup positioned above the circle
                floodPronePopupRef.current = new mapboxgl.Popup({
                  closeButton: false,
                  closeOnClick: false,
                  anchor: "bottom",
                  offset: 25,
                })
                  .setLngLat(coordinates)
                  .setDOMContent(popupContainer)
                  .addTo(map);
              }
            });

            map.on("mouseleave", `${area.id}-layer`, () => {
              map.getCanvas().style.cursor = "";
              if (floodPronePopupRef.current) {
                floodPronePopupRef.current.remove();
                floodPronePopupRef.current = null;
              }
            });
          });
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

        // Population layer hover and click interactions
        let hoveredPopulationId: string | null = null;

        map.on("mousemove", "mandaue_population-fill", (e) => {
          if (!overlayVisibilityRef.current["mandaue_population-layer"]) return;

          if (e.features && e.features.length > 0) {
            map.getCanvas().style.cursor = "pointer";

            const feature = e.features[0];
            if (hoveredPopulationId !== null) {
              map.setFeatureState(
                { source: "mandaue_population", id: hoveredPopulationId },
                { hover: false }
              );
            }
            hoveredPopulationId = feature.id as string;
            map.setFeatureState(
              { source: "mandaue_population", id: hoveredPopulationId },
              { hover: true }
            );
          }
        });

        map.on("mouseleave", "mandaue_population-fill", () => {
          if (!overlayVisibilityRef.current["mandaue_population-layer"]) return;

          map.getCanvas().style.cursor = "";
          if (hoveredPopulationId !== null) {
            map.setFeatureState(
              { source: "mandaue_population", id: hoveredPopulationId },
              { hover: false }
            );
          }
          hoveredPopulationId = null;
        });

        map.on("click", "mandaue_population-fill", (e) => {
          if (!overlayVisibilityRef.current["mandaue_population-layer"]) return;

          if (e.features && e.features.length > 0) {
            const feature = e.features[0];
            const props = feature.properties || {};

            // Clear previous clicked state
            if (clickedPopulationIdRef.current !== null) {
              map.setFeatureState(
                {
                  source: "mandaue_population",
                  id: clickedPopulationIdRef.current,
                },
                { clicked: false }
              );
            }

            // Set new clicked state
            clickedPopulationIdRef.current = feature.id as string;
            map.setFeatureState(
              {
                source: "mandaue_population",
                id: clickedPopulationIdRef.current,
              },
              { clicked: true }
            );

            // Remove existing popup
            if (populationPopupRef.current) {
              populationPopupRef.current.remove();
            }

            // Create popup container
            const popupContainer = document.createElement("div");
            popupContainer.style.padding = "0px";
            popupContainer.style.minWidth = "200px";
            popupContainer.style.position = "relative";

            // Create close button
            const closeButton = document.createElement("button");
            closeButton.style.cssText =
              "position: absolute; width: 23px; height: 23px; top: -1px; right: -1px; background: none; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 30px; transition: background-color 0.2s; background-color: #f3f4f6;";
            closeButton.innerHTML = `
              <svg width="9" height="9" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 1L1 13M1 1L13 13" stroke="#4a5565" stroke-width="2" stroke-linecap="round"/>
              </svg>
            `;
            closeButton.onmouseover = () =>
              (closeButton.style.backgroundColor = "#e5e7eb");
            closeButton.onmouseout = () =>
              (closeButton.style.backgroundColor = "#f3f4f6");

            // Create content
            const content = document.createElement("div");
            content.innerHTML = `
              <h3 style="margin: 0 0 10px 0; font-size: 12px; font-weight: 600; padding-right: 0px;">Barangay ${
                props.name || "Unknown Area"
              }</h3>
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #666; font-size: 12px;">Population</span>
                  <span style=" font-size: 12px;">${
                    props["population-count"] || "N/A"
                  }</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #666; font-size: 12px;">Density</span>
                  <span style=" font-size: 12px;">${
                    props["population-density"] || "N/A"
                  } per km²</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #666; font-size: 12px;">Land Area</span>
                  <span style=" font-size: 12px;">${
                    props["land-area"] || "N/A"
                  } km²</span>
                </div>
              </div>
            `;

            popupContainer.appendChild(closeButton);
            popupContainer.appendChild(content);

            // Get the center of the polygon
            const coordinates = e.lngLat;

            // Create and add popup without default close button
            populationPopupRef.current = new mapboxgl.Popup({
              closeButton: false,
              closeOnClick: false,
              maxWidth: "300px",
              className: "population-popup",
            })
              .setLngLat(coordinates)
              .setDOMContent(popupContainer)
              .addTo(map);

            // Add click handler to close button that properly closes the popup
            closeButton.onclick = () => {
              if (populationPopupRef.current) {
                populationPopupRef.current.remove();
              }
            };
          }
        });

        // Handle clicks outside population areas to clear clicked state
        map.on("click", (e) => {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ["mandaue_population-fill"],
          });

          // If click is outside population areas, clear clicked state
          if (
            features.length === 0 &&
            clickedPopulationIdRef.current !== null
          ) {
            map.setFeatureState(
              {
                source: "mandaue_population",
                id: clickedPopulationIdRef.current,
              },
              { clicked: false }
            );
            clickedPopulationIdRef.current = null;

            // Also remove popup if it exists
            if (populationPopupRef.current) {
              populationPopupRef.current.remove();
            }
          }
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

      // Control population fill layer visibility
      const populationVisible = overlayVisibility["mandaue_population-layer"];
      if (mapRef.current?.getLayer("mandaue_population-fill")) {
        mapRef.current.setLayoutProperty(
          "mandaue_population-fill",
          "visibility",
          populationVisible ? "visible" : "none"
        );
      }

      // Clear population layer selection when toggled off
      if (!populationVisible) {
        if (clickedPopulationIdRef.current !== null && mapRef.current) {
          mapRef.current.setFeatureState(
            {
              source: "mandaue_population",
              id: clickedPopulationIdRef.current,
            },
            { clicked: false }
          );
          clickedPopulationIdRef.current = null;
        }
        if (populationPopupRef.current) {
          populationPopupRef.current.remove();
          populationPopupRef.current = null;
        }
      }
    }
  }, [overlayVisibility, layerIds]);

  useEffect(() => {
    if (mapRef.current) {
      Object.entries(floodProneVisibility).forEach(([areaId, isVisible]) => {
        const layerId = `${areaId}-layer`;
        if (mapRef.current?.getLayer(layerId)) {
          mapRef.current.setLayoutProperty(
            layerId,
            "visibility",
            isVisible ? "visible" : "none"
          );
        }
      });
    }
  }, [floodProneVisibility]);

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
    const isCurrentlyVisible =
      overlayVisibility[layerId as keyof typeof overlayVisibility];
    const newVisibility = !isCurrentlyVisible;

    setOverlayVisibility((prev) => ({
      ...prev,
      [layerId]: newVisibility,
    }));

    // Add delay feature for flood hazard layer
    if (layerId === "flood_hazard-layer") {
      if (newVisibility) {
        // If flood hazard layer is being turned ON
        setIsFloodScenarioLoading(true);
        // Simulate a loading delay
        setTimeout(() => {
          setIsFloodScenarioLoading(false);
        }, 1500); // 1.5 seconds delay
      }
    }

    // If turning on an overlay, hide all flood prone areas
    if (newVisibility) {
      const anyFloodProneVisible = Object.values(floodProneVisibility).some(
        (v) => v
      );
      if (anyFloodProneVisible) {
        setFloodProneVisibility({
          downstream_south_area: false,
          mc_briones_highway: false,
          lh_prime_area: false,
          rolling_hills_area: false,
          downstream_east_area: false,
          maguikay_cabancalan_tabok_tingub_butuaonon: false,
          paknaan_butuanon: false,
          basak_pagsabungan: false,
          maguikay_barangay_road: false,
        });

        // Debounce toast to show only once per toggle session
        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current);
        }
        toastTimeoutRef.current = setTimeout(() => {
          toast.info(
            "Flood prone areas hidden to improve clarity with map layers"
          );
          toastTimeoutRef.current = null;
        }, 100);
      }
    }
  };

  const overlayData = OVERLAY_CONFIG.map((config) => ({
    ...config,
    visible: overlayVisibility[config.id as keyof typeof overlayVisibility],
  }));

  const floodProneAreasData = [
    {
      id: "downstream_south_area",
      name: "Downstream South",
      color: "#DC2626",
      visible: floodProneVisibility["downstream_south_area"] || false,
    },
    {
      id: "mc_briones_highway",
      name: "Briones Highway",
      color: "#059669",
      visible: floodProneVisibility["mc_briones_highway"] || false,
    },
    {
      id: "lh_prime_area",
      name: "LH Prime",
      color: "#0284C7",
      visible: floodProneVisibility["lh_prime_area"] || false,
    },
    {
      id: "rolling_hills_area",
      name: "Rolling Hills",
      color: "#EA580C",
      visible: floodProneVisibility["rolling_hills_area"] || false,
    },
    {
      id: "downstream_east_area",
      name: "Downstream East",
      color: "#0D9488",
      visible: floodProneVisibility["downstream_east_area"] || false,
    },
    {
      id: "maguikay_cabancalan_tabok_tingub_butuaonon",
      name: "Butuanon River",
      color: "#D97706",
      visible:
        floodProneVisibility["maguikay_cabancalan_tabok_tingub_butuaonon"] ||
        false,
    },
    {
      id: "paknaan_butuanon",
      name: "Paknaan Basin",
      color: "#7C3AED",
      visible: floodProneVisibility["paknaan_butuanon"] || false,
    },
    {
      id: "basak_pagsabungan",
      name: "Bask & Pagsabungan",
      color: "#0891B2",
      visible: floodProneVisibility["basak_pagsabungan"] || false,
    },
    {
      id: "maguikay_barangay_road",
      name: "Maguikay Road",
      color: "#DB2777",
      visible: floodProneVisibility["maguikay_barangay_road"] || false,
    },
  ];

  const handleToggleFloodProneArea = (areaId: string) => {
    const isCurrentlyVisible =
      floodProneVisibility[areaId as keyof typeof floodProneVisibility];
    const newVisibility = !isCurrentlyVisible;

    setFloodProneVisibility((prev) => ({
      ...prev,
      [areaId]: newVisibility,
    }));

    // If turning on a flood prone area, hide all overlays except reports
    if (newVisibility) {
      const anyOverlayVisible = Object.entries(overlayVisibility).some(
        ([key, value]) => key !== "reports-layer" && value
      );

      if (anyOverlayVisible) {
        setOverlayVisibility((prev) => ({
          ...prev,
          "man_pipes-layer": false,
          "storm_drains-layer": false,
          "inlets-layer": false,
          "outlets-layer": false,
          "flood_hazard-layer": false,
          "mandaue_population-layer": false,
        }));

        // Debounce toast to show only once per toggle session
        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current);
        }
        toastTimeoutRef.current = setTimeout(() => {
          toast.info(
            "Map layers hidden to improve clarity with flood prone areas"
          );
          toastTimeoutRef.current = null;
        }, 100);
      }
    }
  };

  const handleToggleAllOverlays = () => {
    const someVisible = Object.values(overlayVisibility).some(Boolean);

    const updated: typeof overlayVisibility = {
      "man_pipes-layer": !someVisible,
      "storm_drains-layer": !someVisible,
      "inlets-layer": !someVisible,
      "outlets-layer": !someVisible,
      "reports-layer": !someVisible,
      "flood_hazard-layer": !someVisible,
      "mandaue_population-layer": !someVisible,
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
          floodProneAreas={floodProneAreasData}
          onToggleFloodProneArea={handleToggleFloodProneArea}
          selectedFloodScenario={selectedFloodScenario}
          onChangeFloodScenario={handleFloodScenarioChange}
          reports={reports}
          onRefreshReports={onRefreshReports}
          isRefreshingReports={isRefreshingReports}
          allReportsData={allReportsData} // Pass all reports data to ControlPanel
          isFloodScenarioLoading={isFloodScenarioLoading}
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
