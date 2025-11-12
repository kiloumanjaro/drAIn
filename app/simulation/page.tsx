/* eslint-disable */

"use client";

import { ControlPanel } from "@/components/control-panel";
import { CameraControls } from "@/components/camera-controls";
import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  MAP_BOUNDS,
  MAPBOX_ACCESS_TOKEN,
} from "@/lib/map/config";

import {
  runSimulation,
  transformToNodeDetails,
} from "@/lib/simulation-api/simulation";
import { enableRain, disableRain } from "@/lib/map/effects/rain-utils";

import {
  SIMULATION_MAP_STYLE,
  SIMULATION_PITCH,
  SIMULATION_BEARING,
  SIMULATION_LAYER_IDS,
  LAYER_COLORS,
  CAMERA_ANIMATION,
  getLinePaintConfig,
  getCirclePaintConfig,
} from "@/lib/map/simulation-config";
import mapboxgl from "mapbox-gl";
import { useInlets } from "@/hooks/useInlets";
import { useOutlets } from "@/hooks/useOutlets";
import { useDrain } from "@/hooks/useDrain";
import { usePipes } from "@/hooks/usePipes";
import type {
  DatasetType,
  Inlet,
  Outlet,
  Drain,
  Pipe,
} from "@/components/control-panel/types";

import "mapbox-gl/dist/mapbox-gl.css";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { VulnerabilityDataTable } from "@/components/vulnerability-data-table";
import { fetchYRTable } from "@/lib/Vulnerabilities/FetchDeets";
import { NodeSimulationSlideshow } from "@/components/node-simulation-slideshow";
import { NodeParametersPanel } from "@/components/node-parameters-panel";
import { LinkParametersPanel } from "@/components/link-parameters-panel";
import { Minimize } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

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
  const isSimulationActive = searchParams.get("active") === "true";
  const { setOpen, isMobile, setOpenMobile, open } = useSidebar();

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const [selectedFloodScenario, setSelectedFloodScenario] =
    useState<string>("5YR");

  const [overlayVisibility, setOverlayVisibility] = useState({
    "man_pipes-layer": true,
    "storm_drains-layer": true,
    "inlets-layer": true,
    "outlets-layer": true,
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
  const [controlPanelTab, setControlPanelTab] = useState<string>("simulations");
  const [controlPanelDataset, setControlPanelDataset] =
    useState<DatasetType>("inlets");
  const [selectedPointForSimulation, setSelectedPointForSimulation] = useState<
    string | null
  >(null);

  // Vulnerability table state (Model 2)
  const [selectedYear, setSelectedYear] = useState<YearOption | null>(null);
  const [tableData, setTableData] = useState<NodeDetails[] | null>(null);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [isTableMinimized, setIsTableMinimized] = useState(false);
  const [tablePosition, setTablePosition] = useState<{ x: number; y: number }>({
    x: typeof window !== "undefined" ? window.innerWidth * 0.6 - 250 : 400,
    y: typeof window !== "undefined" ? window.innerHeight * 0.5 - 300 : 100,
  });
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(
    new Set()
  );
  const [vulnerabilityMap, setVulnerabilityMap] = useState<Map<string, string>>(
    new Map()
  );

  // Model 3 table state
  const [tableData3, setTableData3] = useState<NodeDetails[] | null>(null);
  const [isLoadingTable3, setIsLoadingTable3] = useState(false);
  const [isTable3Minimized, setIsTable3Minimized] = useState(false);
  const [table3Position, setTable3Position] = useState<{
    x: number;
    y: number;
  }>({
    x: typeof window !== "undefined" ? window.innerWidth * 0.6 - 250 : 400,
    y: typeof window !== "undefined" ? window.innerHeight * 0.5 - 300 : 100,
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
  const [isRainActive, setIsRainActive] = useState(false);
  const [isFloodScenarioLoading, setIsFloodScenarioLoading] = useState(false);

  // Panel visibility - mutual exclusivity
  const [activePanel, setActivePanel] = useState<"node" | "link" | null>(null);

  // Panel positions (persisted in localStorage)
  const [nodePanelPosition, setNodePanelPosition] = useState<{
    x: number;
    y: number;
  }>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nodePanelPosition");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse saved node panel position", e);
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
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("linkPanelPosition");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse saved link panel position", e);
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
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "nodePanelPosition",
        JSON.stringify(nodePanelPosition)
      );
    }
  }, [nodePanelPosition]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "linkPanelPosition",
        JSON.stringify(linkPanelPosition)
      );
    }
  }, [linkPanelPosition]);

  // Auto-open node panel when components selected
  useEffect(() => {
    if (selectedComponentIds.length > 0 && activePanel !== "node") {
      setActivePanel("node");
    } else if (selectedComponentIds.length === 0 && activePanel === "node") {
      setActivePanel(null);
    }
  }, [selectedComponentIds.length]);

  // Auto-open link panel when pipes selected
  useEffect(() => {
    if (selectedPipeIds.length > 0 && activePanel !== "link") {
      setActivePanel("link");
    } else if (selectedPipeIds.length === 0 && activePanel === "link") {
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
        if (!map.getSource("mapbox-dem")) {
          map.addSource("mapbox-dem", {
            type: "raster-dem",
            url: "mapbox://mapbox.mapbox-terrain-dem-v1",
            tileSize: 512,
            maxzoom: 14,
          });
          map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });
        }

        // Enable 3D buildings using Mapbox Standard style configuration
        // Standard style has built-in 3D buildings that can be configured
        try {
          if (map.setConfigProperty) {
            map.setConfigProperty('basemap', 'showBuildingExtrusions', true);
          }
        } catch (error) {
          console.warn("Could not enable 3D buildings:", error);
        }

        if (!map.getSource("man_pipes")) {
          map.addSource("man_pipes", {
            type: "geojson",
            data: "/drainage/man_pipes.geojson",
            promoteId: "Name",
          });
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

      // Click handlers
      map.on("click", (e) => {
        if (!isSimulationActive) return;

        const validLayers = [
          "inlets-layer",
          "outlets-layer",
          "storm_drains-layer",
          "man_pipes-layer",
        ].filter((id) => map.getLayer(id));

        if (!validLayers.length) return;

        const features = map.queryRenderedFeatures(e.point, {
          layers: validLayers,
        });

        if (!features.length) {
          clearSelections();
          setControlPanelTab("simulations");
          return;
        }

        const feature = features[0];
        const props = feature.properties || {};
        if (!feature.layer) return;

        switch (feature.layer.id) {
          case "man_pipes-layer": {
            const pipe = pipesRef.current.find((p) => p.id === props.Name);
            if (pipe) handleSelectPipe(pipe);
            break;
          }
          case "inlets-layer": {
            const inlet = inletsRef.current.find((i) => i.id === props.In_Name);
            if (inlet) handleSelectInlet(inlet);
            break;
          }
          case "outlets-layer": {
            const outlet = outletsRef.current.find(
              (o) => o.id === props.Out_Name
            );
            if (outlet) handleSelectOutlet(outlet);
            break;
          }
          case "storm_drains-layer": {
            const drain = drainsRef.current.find((d) => d.id === props.In_Name);
            if (drain) handleSelectDrain(drain);
            break;
          }
        }
      });

      // Cursor style
      layerIds.forEach((layerId) => {
        map.on("mouseenter", layerId, () => {
          if (isSimulationActive) {
            map.getCanvas().style.cursor = "pointer";
          }
        });
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
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
            "visibility",
            overlayVisibility[layerId as keyof typeof overlayVisibility]
              ? "visible"
              : "none"
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
    const isVisible = !overlayVisibility[layerId as keyof typeof overlayVisibility];
    setOverlayVisibility((prev) => ({
      ...prev,
      [layerId]: !prev[layerId as keyof typeof prev],
    }));

    if (layerId === "flood_hazard-layer") {
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
      id: "man_pipes-layer",
      name: "Pipes",
      color: LAYER_COLORS.man_pipes.color,
      visible: overlayVisibility["man_pipes-layer"],
    },
    {
      id: "storm_drains-layer",
      name: "Storm Drains",
      color: LAYER_COLORS.storm_drains.color,
      visible: overlayVisibility["storm_drains-layer"],
    },
    {
      id: "inlets-layer",
      name: "Inlets",
      color: LAYER_COLORS.inlets.color,
      visible: overlayVisibility["inlets-layer"],
    },
    {
      id: "outlets-layer",
      name: "Outlets",
      color: LAYER_COLORS.outlets.color,
      visible: overlayVisibility["outlets-layer"],
    },
  ];

  const handleToggleAllOverlays = () => {
    const someVisible = Object.values(overlayVisibility).some(Boolean);

    const updated: typeof overlayVisibility = {
      "man_pipes-layer": !someVisible,
      "storm_drains-layer": !someVisible,
      "inlets-layer": !someVisible,
      "outlets-layer": !someVisible,
    };

    setOverlayVisibility(updated);
  };

  const someVisible = Object.values(overlayVisibility).some(Boolean);

  // Panel toggle handlers
  const handleToggleNodePanel = () => {
    if (activePanel === "node") {
      setActivePanel(null); // Close
    } else {
      setActivePanel("node"); // Open and close link panel
    }
  };

  const handleToggleLinkPanel = () => {
    if (activePanel === "link") {
      setActivePanel(null); // Close
    } else {
      setActivePanel("link"); // Open and close node panel
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
    setControlPanelTab("simulations");
  };

  const handleSelectInlet = (inlet: Inlet) => {
    if (!mapRef.current) return;
    const [lng, lat] = inlet.coordinates;

    // Clear any previous selections first
    clearSelections();

    // Set the new selection state for control panel
    setSelectedInlet(inlet);
    setControlPanelTab("simulations"); // Switch to simulations tab
    setControlPanelDataset("inlets");
    setSelectedPointForSimulation(inlet.id); // Pass to simulations content

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
        Outlet distance updated. Go{" "}
        <button
          className="underline hover:text-[#5a525a] cursor-pointer bg-transparent border-none p-0"
          onClick={() => {
            setControlPanelTab("stats");
          }}
        >
          here
        </button>{" "}
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
        <strong>{outlet.id}</strong> is selected. Go{" "}
        <button
          className="underline hover:text-[#5a525a] cursor-pointer bg-transparent border-none p-0"
          onClick={() => {
            setControlPanelTab("stats");
          }}
        >
          here
        </button>{" "}
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
    setControlPanelTab("simulations"); // Switch to simulations tab
    setControlPanelDataset("storm_drains");
    setSelectedPointForSimulation(drain.id); // Pass to simulations content

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
        Outlet distance updated. Go{" "}
        <button
          className="underline hover:text-[#5a525a] cursor-pointer bg-transparent border-none p-0"
          onClick={() => {
            setControlPanelTab("stats");
          }}
        >
          here
        </button>{" "}
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
        <strong>{pipe.id}</strong> is selected. Go{" "}
        <button
          className="underline hover:text-[#5a525a] cursor-pointer bg-transparent border-none p-0"
          onClick={() => {
            setControlPanelTab("stats");
          }}
        >
          here
        </button>{" "}
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
      router.push("/map");
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
      "Unique vulnerability categories:",
      Array.from(uniqueCategories)
    );
    // console.log("Sample nodes:", vulnerabilityData.slice(0, 5));

    // Color mapping for vulnerability categories
    // Using a function to handle case-insensitive and flexible matching
    const getColorForCategory = (category: string): string => {
      const normalized = category.toLowerCase().trim();

      if (normalized.includes("high")) return "#D32F2F";
      if (normalized.includes("medium")) return "#FFA000";
      if (normalized.includes("low")) return "#FFF176";
      if (normalized.includes("no")) return "#388E3C";

      // Fallback based on exact matches
      const colorMap: Record<string, string> = {
        "High Risk": "#D32F2F",
        "Medium Risk": "#FFA000",
        "Low Risk": "#FFF176",
        "No Risk": "#388E3C",
        "high risk": "#D32F2F",
        "medium risk": "#FFA000",
        "low risk": "#FFF176",
        "no risk": "#388E3C",
      };

      return colorMap[category] || colorMap[normalized] || "#5687ca";
    };

    // Get darker stroke color for vulnerability categories
    const getStrokeColorForCategory = (category: string): string => {
      const normalized = category.toLowerCase().trim();

      if (normalized.includes("high")) return "#8B0000"; // Dark red
      if (normalized.includes("medium")) return "#B36200"; // Dark amber
      if (normalized.includes("low")) return "#C4B000"; // Dark yellow
      if (normalized.includes("no")) return "#1B5E20"; // Dark green

      // Fallback based on exact matches
      const strokeColorMap: Record<string, string> = {
        "High Risk": "#8B0000",
        "Medium Risk": "#B36200",
        "Low Risk": "#C4B000",
        "No Risk": "#1B5E20",
        "high risk": "#8B0000",
        "medium risk": "#B36200",
        "low risk": "#C4B000",
        "no risk": "#1B5E20",
      };

      return (
        strokeColorMap[category] || strokeColorMap[normalized] || "#00346c"
      );
    };

    // Build match expression for Mapbox for inlets
    // Format: ["match", ["get", "In_Name"], node1, color1, node2, color2, ..., defaultColor]
    const inletsMatchExpression: any[] = ["match", ["get", "In_Name"]];
    const inletsStrokeMatchExpression: any[] = ["match", ["get", "In_Name"]];

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
    inletsMatchExpression.push("#00ca67"); // Original inlets color
    inletsStrokeMatchExpression.push("#005400"); // Original inlets stroke color

    // Build match expression for storm drains
    const drainsMatchExpression: any[] = ["match", ["get", "In_Name"]];
    const drainsStrokeMatchExpression: any[] = ["match", ["get", "In_Name"]];

    vulnerabilityData.forEach((node) => {
      const color = getColorForCategory(node.Vulnerability_Category);
      const strokeColor = getStrokeColorForCategory(
        node.Vulnerability_Category
      );
      drainsMatchExpression.push(node.Node_ID, color);
      drainsStrokeMatchExpression.push(node.Node_ID, strokeColor);
    });

    // Default color for drains not in vulnerability data
    drainsMatchExpression.push("#5687ca"); // Original storm_drains color
    drainsStrokeMatchExpression.push("#00346c"); // Original storm_drains stroke color

    // Update inlets-layer color and stroke
    if (map.getLayer("inlets-layer")) {
      map.setPaintProperty("inlets-layer", "circle-color", [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        "#66ed7b", // Selected color (light green)
        inletsMatchExpression,
      ]);
      map.setPaintProperty("inlets-layer", "circle-stroke-color", [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        "#307524", // Selected stroke color
        inletsStrokeMatchExpression,
      ]);
      // console.log("Updated inlets-layer color and stroke");
    }

    // Update storm_drains-layer color and stroke
    if (map.getLayer("storm_drains-layer")) {
      map.setPaintProperty("storm_drains-layer", "circle-color", [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        "#49a8ff", // Selected color (cyan)
        drainsMatchExpression,
      ]);
      map.setPaintProperty("storm_drains-layer", "circle-stroke-color", [
        "case",
        ["boolean", ["feature-state", "selected"], false],
        "#355491", // Selected stroke color
        drainsStrokeMatchExpression,
      ]);
      // console.log("Updated storm_drains-layer color and stroke");
    }
  };

  const handleClosePopUps = () => {
    setIsTableMinimized(true);
    setIsTable3Minimized(true);
    setTableData(null);
    setTableData3(null);
    setActivePanel(null);
  }
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
        "outlets-layer": false,
        "man_pipes-layer": false,
      }));

      // Apply vulnerability colors to inlets and storm drains
      applyVulnerabilityColors(data);

      // Enable rain effect
      if (mapRef.current) {
        enableRain(mapRef.current, 1.0);
        setIsRainActive(true);
      }

      toast.success(
        `Successfully loaded ${data.length} nodes for ${selectedYear}YR`
      );
    } catch (error) {
      console.error("Error fetching vulnerability data:", error);
      toast.error("Failed to load vulnerability data. Please try again.");
      setTableData(null);
    } finally {
      setIsLoadingTable(false);
    }
  };

  // Model 3 table handler
  const handleGenerateTable3 = async () => {
    if (selectedComponentIds.length === 0) {
      toast.error("Please select at least one component");
      return;
    }

    // Close panels before starting
    if (activePanel === "node") {
      setActivePanel(null);
    }
    if (activePanel === "link") {
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
        "outlets-layer": false,
        "man_pipes-layer": false,
      }));

      // Apply vulnerability colors to inlets and storm drains
      applyVulnerabilityColors(transformedData);

      // Enable rain effect with dynamic intensity based on precipitation
      if (mapRef.current) {
        // Map 0-300mm precipitation to 0.3-1.0 intensity range
        const normalized = rainfallParams.total_precip / 300; // 0-1 range
        const intensity = 0.3 + (normalized * 0.7); // Map to 0.3-1.0
        enableRain(mapRef.current, intensity);
        setIsRainActive(true);
      }

      toast.success(
        `Successfully generated vulnerability data for ${transformedData.length} nodes`
      );
    } catch (error) {
      console.error("Error running simulation:", error);
      toast.error("Simulation failed. Please try again.");
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
  };

  const handleYearChange = (year: number | null) => {
    setSelectedYear(year as YearOption | null);
  };

  // Model 3 table handlers
  const handleToggleTable3Minimize = () => {
    setIsTable3Minimized(!isTable3Minimized);
  };

  const handleCloseTable3 = () => {
    setTableData3(null);
    setIsTable3Minimized(false);
  };

  // Rain toggle handler
  const handleToggleRain = useCallback((enabled: boolean) => {
    if (!mapRef.current) return;

    if (enabled) {
      // Determine intensity based on which model is active
      let intensity = 1.0; // Default for Model2

      // If Model3 is active and has rainfall params, use dynamic intensity
      // Map 0-300mm precipitation to 0.3-1.0 intensity range
      if (tableData3 && rainfallParams) {
        const normalized = rainfallParams.total_precip / 300; // 0-1 range
        intensity = 0.3 + (normalized * 0.7); // Map to 0.3-1.0
      }

      enableRain(mapRef.current, intensity);
      setIsRainActive(true);
    } else {
      disableRain(mapRef.current);
      setIsRainActive(false);
    }
  }, [tableData3, rainfallParams]);

  // Helper function to parse Node_ID and determine source and feature ID
  const parseNodeId = (
    nodeId: string
  ): { source: string | null; featureId: string | null } => {
    if (nodeId.startsWith("ISD-")) {
      // Storm drain: ISD-* maps to storm_drains source with In_Name as promoteId
      return { source: "storm_drains", featureId: nodeId };
    } else if (nodeId.startsWith("I-")) {
      // Inlet: I-* maps to inlets source with In_Name as promoteId
      return { source: "inlets", featureId: nodeId };
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
      toast.error("Unable to locate node on map");
      return;
    }

    // Find the node coordinates from our data
    let coordinates: [number, number] | null = null;
    if (source === "inlets") {
      const inlet = inletsRef.current.find((i) => i.id === featureId);
      if (inlet) coordinates = inlet.coordinates;
    } else if (source === "storm_drains") {
      const drain = drainsRef.current.find((d) => d.id === featureId);
      if (drain) coordinates = drain.coordinates;
    }

    if (!coordinates) {
      toast.error("Unable to locate node coordinates");
      return;
    }

    // If selectedYear is not set (Model 3 scenario), try to extract it from table data
    let yearToUse = selectedYear;
    if (!yearToUse) {
      // Try to find the year from Model 3 table data
      if (tableData3) {
        const nodeData = tableData3.find((node) => node.Node_ID === nodeId);
        if (nodeData && nodeData.YR) {
          // Set the year from the node data
          yearToUse = nodeData.YR as YearOption;
          setSelectedYear(yearToUse);
        } else {
          toast.error("Unable to determine year for simulation data");
          return;
        }
      } else {
        toast.error("Please select a year or generate simulation data first");
        return;
      }
    }

    // Step 1: Extract node data and all data from the appropriate table
    const activeTableData = tableData3 || tableData;
    if (!activeTableData) {
      toast.error("No table data available");
      return;
    }

    const nodeData = activeTableData.find((node) => node.Node_ID === nodeId);
    if (!nodeData) {
      toast.error("Node data not found in table");
      return;
    }

    // Step 2: Minimize both tables instead of closing them (Model 2 and Model 3)
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

  // Cleanup rain effect when component unmounts
  useEffect(() => {
    return () => {
      if (mapRef.current && isRainActive) {
        disableRain(mapRef.current);
      }
    };
  }, [isRainActive]);

  return (
    <>
      <main className="relative min-h-screen flex flex-col bg-gray-900">
        <div
          className="w-full h-screen relative"
          style={{ pointerEvents: isSimulationActive ? "auto" : "none" }}
        >
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Grey overlay when simulation is not active */}
          {!isSimulationActive && (
            <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center">
              <div className="text-white text-xl font-medium">
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
          showNodePanel={activePanel === "node"}
          onToggleNodePanel={handleToggleNodePanel}
          showLinkPanel={activePanel === "link"}
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

        {/* Vulnerability Data Table Overlay (Model 2) */}
        {/* Vulnerability Data Table Overlay (Model 2) - Only render when NOT minimized */}
        {tableData && !isTableMinimized && (
          <div
            className="absolute z-20 pointer-events-auto"
            style={{
              left: `${tablePosition.x}px`,
              top: `${tablePosition.y}px`,
            }}
          >
            {isLoadingTable ? <Spinner /> : <VulnerabilityDataTable
              data={tableData}
              isMinimized={false}
              onToggleMinimize={handleToggleTableMinimize}
              position={tablePosition}
              onPositionChange={setTablePosition}
              onHighlightNodes={handleHighlightNodes}
              onOpenNodeSimulation={handleOpenNodeSimulation}
            />}
          </div>
        )}

        {/* Vulnerability Data Table Overlay (Model 3) - Only render when NOT minimized */}
        {tableData3 && !isTable3Minimized && (
          <div
            className="absolute z-20 pointer-events-auto"
            style={{
              left: `${table3Position.x}px`,
              top: `${table3Position.y}px`,
            }}
          >
            {isLoadingTable3 ? <Spinner /> : <VulnerabilityDataTable
              data={tableData3}
              isMinimized={false}
              onToggleMinimize={handleToggleTable3Minimize}
              position={table3Position}
              onPositionChange={setTable3Position}
              onHighlightNodes={handleHighlightNodes}
              onOpenNodeSimulation={handleOpenNodeSimulation}
            />}
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
        {activePanel === "node" && selectedComponentIds.length > 0 && (
          <div
            style={{
              position: "fixed",
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
        {activePanel === "link" && selectedPipeIds.length > 0 && (
          <div
            style={{
              position: "fixed",
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
