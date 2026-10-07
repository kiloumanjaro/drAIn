import { useRef, useState, type RefObject } from 'react';
import type mapboxgl from 'mapbox-gl';
import { toast } from 'sonner';
import { CAMERA_ANIMATION } from '@/lib/map/simulation-config';
import type { NodeCoordinates, NodeDetails } from '@/types/simulation';
import {
  CAMERA_FLY_DURATION_MS,
  findNodeCoordinates,
  parseNodeId,
} from './page.helpers';

interface NodeSlideshowOptions {
  /** Where the nodes are; read when a slideshow is opened. */
  inletsRef: RefObject<NodeCoordinates[]>;
  drainsRef: RefObject<NodeCoordinates[]>;
  /** The results the slideshow compares the node against, if any. */
  activeTableData: NodeDetails[] | null;
  /** Put the results tables out of the way, or bring them back. */
  setTablesMinimized: (minimized: boolean) => void;
}

/**
 * The per-node results slideshow: flies to a node, highlights it, then
 * opens the slideshow over the map.
 */
export function useNodeSlideshow(
  mapRef: RefObject<mapboxgl.Map | null>,
  {
    inletsRef,
    drainsRef,
    activeTableData,
    setTablesMinimized,
  }: NodeSlideshowOptions
) {
  const [slideshowNode, setSlideshowNode] = useState<string | null>(null);
  const [slideshowNodeData, setSlideshowNodeData] =
    useState<NodeDetails | null>(null);
  const [slideshowAllData, setSlideshowAllData] = useState<
    NodeDetails[] | null
  >(null);
  // Which opening is current (see handleOpenNodeSimulation).
  const slideshowRequestRef = useRef(0);

  const handleOpenNodeSimulation = async (nodeId: string) => {
    const map = mapRef.current;
    if (!map) return;
    // This waits on three timers. A second click, or leaving the page, makes
    // this run stale; it then stops rather than highlighting on a removed map
    // or racing the newer one.
    const request = ++slideshowRequestRef.current;
    const stale = () =>
      slideshowRequestRef.current !== request || mapRef.current !== map;

    // Parse node ID to get source and feature ID
    const { source, featureId } = parseNodeId(nodeId);
    if (!source || !featureId) {
      toast.error('Unable to locate node on map');
      return;
    }

    // Find the node coordinates from our data
    const coordinates = findNodeCoordinates(
      source,
      featureId,
      inletsRef.current,
      drainsRef.current
    );
    if (!coordinates) {
      toast.error('Unable to locate node coordinates');
      return;
    }

    // No return period is needed: the slideshow compares this node against
    // the others in the same results. It used to insist on one, so a custom
    // storm, which has none, could not open it at all.

    // Step 1: Extract node data and all data from the appropriate table
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
    setTablesMinimized(true);

    // Step 3: Wait for tables to minimize and year state to update (300ms delay)
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (stale()) return;

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
    await new Promise((resolve) => setTimeout(resolve, CAMERA_FLY_DURATION_MS));
    if (stale()) return;

    // Step 6: Highlight the node on the map
    map.setFeatureState({ source, id: featureId }, { selected: true });

    // Step 7: Wait a bit for highlight to be visible (200ms)
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (stale()) return;

    // Step 8: Set slideshow data and show the slideshow
    setSlideshowNodeData(nodeData);
    setSlideshowAllData(activeTableData);
    setSlideshowNode(nodeId);
  };

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
    setTablesMinimized(false);
  };

  return {
    slideshowNode,
    slideshowNodeData,
    slideshowAllData,
    handleOpenNodeSimulation,
    handleCloseSlideshowNode,
  };
}
