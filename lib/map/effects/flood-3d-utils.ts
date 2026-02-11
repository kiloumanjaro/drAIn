import mapboxgl from 'mapbox-gl';

interface NodeDetails {
  Node_ID: string;
  Vulnerability_Category: string;
  Total_Flood_Volume: number;
  Maximum_Rate: number;
  Hours_Flooded: number;
  Time_Before_Overflow: number;
}

interface NodeCoordinates {
  id: string;
  coordinates: [number, number];
}

interface PipeFeature {
  type: 'Feature';
  properties: {
    Name: string;
    Pipe_Lngth: number;
    [key: string]: any;
  };
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}

/**
 * Get RGB color (without alpha) for line visualization
 * Returns format: "rgb(r, g, b)"
 */
function getFloodColorRGB(category: string): string {
  const normalized = category.toLowerCase().trim();

  if (normalized.includes('high')) return 'rgb(211, 47, 47)';
  if (normalized.includes('medium')) return 'rgb(255, 160, 0)';
  if (normalized.includes('low')) return 'rgb(255, 235, 100)';
  if (normalized.includes('no')) return 'rgb(56, 142, 60)';

  return 'rgb(33, 150, 243)'; // Default water blue
}

/**
 * Interpolate between two RGB colors
 */
function interpolateColor(
  color1: string,
  color2: string,
  factor: number
): string {
  const rgb1Match = color1.match(/\d+/g);
  const rgb2Match = color2.match(/\d+/g);

  if (!rgb1Match || !rgb2Match) return color1;

  const rgb1 = rgb1Match.map(Number);
  const rgb2 = rgb2Match.map(Number);

  const r = Math.round(rgb1[0] + (rgb2[0] - rgb1[0]) * factor);
  const g = Math.round(rgb1[1] + (rgb2[1] - rgb1[1]) * factor);
  const b = Math.round(rgb1[2] + (rgb2[2] - rgb1[2]) * factor);

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Split a pipe into multiple segments with gradient colors
 * Creates smooth color transitions from start to end
 */
function createGradientSegments(
  coords: [number, number][],
  startColor: string,
  endColor: string,
  floodVolume: number,
  pipeName: string,
  startNodeId?: string,
  endNodeId?: string
): GeoJSON.Feature[] {
  if (coords.length < 2) return [];

  // If same color at both ends, just create one feature
  if (startColor === endColor) {
    return [
      {
        type: 'Feature',
        properties: {
          pipeName,
          floodVolume,
          color: startColor,
          startNodeId,
          endNodeId,
        },
        geometry: {
          type: 'LineString',
          coordinates: coords,
        },
      },
    ];
  }

  // If only 2 coords (direct line), subdivide into multiple points for gradient
  let workingCoords = coords;
  if (coords.length === 2) {
    const numSubdivisions = 10; // Create 10 segments for smooth gradient
    workingCoords = [];
    for (let i = 0; i <= numSubdivisions; i++) {
      const t = i / numSubdivisions;
      const lng = coords[0][0] + (coords[1][0] - coords[0][0]) * t;
      const lat = coords[0][1] + (coords[1][1] - coords[0][1]) * t;
      workingCoords.push([lng, lat]);
    }
  }

  const segments: GeoJSON.Feature[] = [];

  // Create segments with interpolated colors
  for (let i = 0; i < workingCoords.length - 1; i++) {
    // Use midpoint of segment for color calculation
    const progress = (i + 0.5) / (workingCoords.length - 1);
    const segmentColor = interpolateColor(startColor, endColor, progress);

    segments.push({
      type: 'Feature',
      properties: {
        pipeName,
        floodVolume,
        color: segmentColor,
        startNodeId,
        endNodeId,
        segmentIndex: i,
      },
      geometry: {
        type: 'LineString',
        coordinates: [workingCoords[i], workingCoords[i + 1]],
      },
    });
  }

  return segments;
}

/**
 * Check if a node is high risk (red)
 */
function isHighRisk(category: string): boolean {
  return category.toLowerCase().trim().includes('high');
}

/**
 * Check if a node is "no risk" (green)
 */
function isNoRisk(category: string): boolean {
  return category.toLowerCase().trim().includes('no');
}

/**
 * Find nearest flooded node to a coordinate
 */
function findNearestFloodedNode(
  coord: [number, number],
  floodedNodes: Map<string, NodeDetails>,
  nodeCoordinates: NodeCoordinates[]
): NodeDetails | null {
  let nearestNode: NodeDetails | null = null;
  let minDistance = Infinity;

  floodedNodes.forEach((node, nodeId) => {
    const nodeCoord = nodeCoordinates.find((n) => n.id === nodeId);
    if (!nodeCoord) return;

    const dx = coord[0] - nodeCoord.coordinates[0];
    const dy = coord[1] - nodeCoord.coordinates[1];
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < minDistance) {
      minDistance = distance;
      nearestNode = node;
    }
  });

  // Only return if within reasonable distance (0.003 degrees ≈ 300m)
  return minDistance < 0.0008 ? nearestNode : null;
}

/**
 * Find the nearest non-green (not "no risk") flooded node to a given node
 * Used for connecting high risk nodes to other at-risk nodes
 */
function findNearestNonGreenNode(
  sourceNodeId: string,
  floodedNodes: Map<string, NodeDetails>,
  nodeCoordinates: NodeCoordinates[]
): { node: NodeDetails; coordinates: [number, number] } | null {
  const sourceCoord = nodeCoordinates.find((n) => n.id === sourceNodeId);
  if (!sourceCoord) return null;

  let nearestNode: NodeDetails | null = null;
  let nearestCoord: [number, number] | null = null;
  let minDistance = Infinity;

  floodedNodes.forEach((node, nodeId) => {
    // Skip self and skip "no risk" (green) nodes
    if (nodeId === sourceNodeId || isNoRisk(node.Vulnerability_Category))
      return;

    const nodeCoord = nodeCoordinates.find((n) => n.id === nodeId);
    if (!nodeCoord) return;

    const dx = sourceCoord.coordinates[0] - nodeCoord.coordinates[0];
    const dy = sourceCoord.coordinates[1] - nodeCoord.coordinates[1];
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < minDistance) {
      minDistance = distance;
      nearestNode = node;
      nearestCoord = nodeCoord.coordinates;
    }
  });

  if (!nearestNode || !nearestCoord) return null;

  return { node: nearestNode, coordinates: nearestCoord };
}

/**
 * Create flood lines along pipes with gradient colors - 2D surface tiles
 */
export function createFloodAlongPipes(
  floodData: NodeDetails[],
  nodeCoordinates: NodeCoordinates[],
  pipes: PipeFeature[]
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  // Create a map of flooded nodes for quick lookup
  const floodedNodes = new Map<string, NodeDetails>();
  floodData.forEach((node) => {
    if (node.Total_Flood_Volume > 0) {
      floodedNodes.set(node.Node_ID, node);
    }
  });

  console.log(
    `[3D Flood] Processing ${pipes.length} pipes for gradient flood visualization`
  );
  console.log(`[3D Flood] Found ${floodedNodes.size} flooded nodes`);

  // Track which high risk nodes have been connected
  const connectedHighRiskNodes = new Set<string>();

  // Process each pipe
  pipes.forEach((pipe) => {
    const coords = pipe.geometry.coordinates;
    if (coords.length < 2) return;

    // Check if pipe endpoints are near flooded nodes
    const startNode = findNearestFloodedNode(
      coords[0],
      floodedNodes,
      nodeCoordinates
    );
    const endNode = findNearestFloodedNode(
      coords[coords.length - 1],
      floodedNodes,
      nodeCoordinates
    );

    // STRICT MATCHING: Only show flood if BOTH endpoints have flooded nodes
    // This prevents a single red node from affecting all pipes within 100m
    if (!startNode || !endNode) return;

    // Mark high risk nodes as connected via pipes
    if (isHighRisk(startNode.Vulnerability_Category)) {
      connectedHighRiskNodes.add(startNode.Node_ID);
    }
    if (isHighRisk(endNode.Vulnerability_Category)) {
      connectedHighRiskNodes.add(endNode.Node_ID);
    }

    // Calculate average flood properties for width calculation
    // Both nodes are guaranteed to exist due to the check above
    const avgFloodVolume =
      (startNode.Total_Flood_Volume + endNode.Total_Flood_Volume) / 2;

    // Get individual node colors (NO AVERAGING!)
    const startColor = getFloodColorRGB(startNode.Vulnerability_Category);
    const endColor = getFloodColorRGB(endNode.Vulnerability_Category);

    // Create gradient segments for smooth color transition
    const gradientSegments = createGradientSegments(
      coords,
      startColor,
      endColor,
      avgFloodVolume,
      pipe.properties.Name,
      startNode.Node_ID,
      endNode.Node_ID
    );

    features.push(...gradientSegments);
  });

  // Connect high risk (red) nodes that weren't connected via pipes
  // to their nearest non-green node with a direct line
  floodedNodes.forEach((node, nodeId) => {
    if (!isHighRisk(node.Vulnerability_Category)) return;
    if (connectedHighRiskNodes.has(nodeId)) return; // Already connected via pipe

    const sourceCoord = nodeCoordinates.find((n) => n.id === nodeId);
    if (!sourceCoord) return;

    const nearest = findNearestNonGreenNode(
      nodeId,
      floodedNodes,
      nodeCoordinates
    );
    if (!nearest) return;

    // Create a direct line between the high risk node and nearest non-green node
    const coords: [number, number][] = [
      sourceCoord.coordinates,
      nearest.coordinates,
    ];

    const startColor = getFloodColorRGB(node.Vulnerability_Category); // Red
    const endColor = getFloodColorRGB(nearest.node.Vulnerability_Category); // Yellow or Orange

    const avgFloodVolume =
      (node.Total_Flood_Volume + nearest.node.Total_Flood_Volume) / 2;

    const gradientSegments = createGradientSegments(
      coords,
      startColor,
      endColor,
      avgFloodVolume,
      `high-risk-connection-${nodeId}`,
      nodeId,
      nearest.node.Node_ID
    );

    features.push(...gradientSegments);
  });

  console.log(`[3D Flood] Created ${features.length} gradient line segments`);

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Enable 2D flood visualization - water tiles that stick to terrain surface
 */
export async function enableFlood3D(
  map: mapboxgl.Map,
  floodData: NodeDetails[],
  inlets: NodeCoordinates[],
  drains: NodeCoordinates[],
  options: {
    opacity?: number;
    animate?: boolean;
    animationDuration?: number;
  } = {}
): Promise<void> {
  if (!map) return;

  const { animate = true, animationDuration = 3000 } = options;

  // Combine inlet and drain coordinates
  const allCoordinates = [...inlets, ...drains];

  console.log('[3D Flood] Loading pipe data...');

  // Load pipes data directly from GeoJSON file
  let pipes: PipeFeature[] = [];

  try {
    const response = await fetch('/drainage/man_pipes.geojson');
    const pipesData = (await response.json()) as GeoJSON.FeatureCollection;
    pipes = (pipesData.features || []) as PipeFeature[];
    console.log(`[3D Flood] Loaded ${pipes.length} pipes from GeoJSON`);
  } catch (error) {
    console.error('[3D Flood] Error loading pipe data:', error);
    return;
  }

  if (pipes.length === 0) {
    console.error('[3D Flood] No pipes found in GeoJSON');
    return;
  }

  // Create flood visualization along pipes
  const floodGeoJSON = createFloodAlongPipes(floodData, allCoordinates, pipes);

  if (floodGeoJSON.features.length === 0) {
    console.warn(
      '[3D Flood] No flood segments created - pipes may not be near flooded nodes'
    );
    return;
  }

  // Remove existing layers and sources if they exist
  if (map.getLayer('flood-gradient-layer')) {
    map.removeLayer('flood-gradient-layer');
  }
  // Remove old layers for backwards compatibility
  if (map.getLayer('flood-3d-layer')) {
    map.removeLayer('flood-3d-layer');
  }
  if (map.getLayer('flood-outline-layer')) {
    map.removeLayer('flood-outline-layer');
  }
  if (map.getSource('flood-3d')) {
    map.removeSource('flood-3d');
  }

  // Add source with lineMetrics enabled (CRITICAL for line-gradient!)
  map.addSource('flood-3d', {
    type: 'geojson',
    data: floodGeoJSON,
    lineMetrics: true, // Required for line-gradient to work
    tolerance: 1, // Simplify geometry for smoother curves (reduces sharp angles)
  });

  // Add line layer with gradient colors
  // We'll add it first, then explicitly move it above the heatmap
  map.addLayer(
    {
      id: 'flood-gradient-layer',
      type: 'line',
      source: 'flood-3d',
      paint: {
        // Use interpolated color per segment
        'line-color': ['get', 'color'],
        // Width based on flood volume - data-driven styling
        'line-width': [
          'interpolate',
          ['linear'],
          ['get', 'floodVolume'],
          0,
          4, // 0 volume = 4px width
          10,
          8, // 10 cubic meters = 8px
          25,
          14, // 25 cubic meters = 14px
          50,
          20, // 50+ cubic meters = 20px
        ],
        // Opacity based on average flood volume
        'line-opacity': animate
          ? 0
          : [
              'interpolate',
              ['linear'],
              ['get', 'floodVolume'],
              0,
              0.2, // Low volume = semi-transparent
              5,
              0.6, // Medium volume
              15,
              0.8, // High volume = more opaque
            ],
        // Blur to soften edges and make sharp turns appear smoother
        // 'line-blur': [
        //   'interpolate',
        //   ['linear'],
        //   ['get', 'floodVolume'],
        //   0,
        //   1, // Light blur for small floods
        //   10,
        //   2, // Medium blur
        //   25,
        //   3, // Heavier blur for larger floods
        // ],
      },
      layout: {
        'line-cap': 'round', // Use butt caps to avoid visible circles at segment boundaries
        'line-join': 'round',
        'visibility': 'visible', // Ensure layer is visible when created
      },
    }
  );

  // Explicitly move the flood gradient layer above the heatmap but below infrastructure
  // Rendering order: flood-propagation-lines < flood-propagation-nodes < flood gradient < pipes/nodes
  try {
    if (map.getLayer('flood_propagation-nodes-layer')) {
      // Find the first infrastructure layer to insert before
      const layers = map.getStyle().layers;
      let beforeLayerId: string | undefined = undefined;

      if (layers) {
        console.log('[3D Flood] Current layers:', layers.map(l => l.id).join(', '));

        // Look for the first drainage infrastructure layer
        const infrastructureLayer = layers.find(
          (layer) => layer.id === 'man_pipes-layer' ||
                     layer.id === 'inlets-layer' ||
                     layer.id === 'outlets-layer' ||
                     layer.id === 'storm_drains-layer'
        );

        if (infrastructureLayer) {
          beforeLayerId = infrastructureLayer.id;
        }
      }

      // Move flood gradient to be right above Flood Propagation but below infrastructure
      if (beforeLayerId) {
        map.moveLayer('flood-gradient-layer', beforeLayerId);
        console.log(`[3D Flood] Moved flood gradient above Flood Propagation, before ${beforeLayerId}`);

        // Verify the move
        const updatedLayers = map.getStyle().layers;
        const gradientIndex = updatedLayers?.findIndex(l => l.id === 'flood-gradient-layer');
        const floodPropagationIndex = updatedLayers?.findIndex(l => l.id === 'flood_propagation-nodes-layer');
        console.log(`[3D Flood] Layer order - Flood Propagation: ${floodPropagationIndex}, Gradient: ${gradientIndex}`);
      } else {
        console.log('[3D Flood] No infrastructure layer found, flood gradient at default position');
      }
    } else {
      console.log('[3D Flood] Flood Propagation layers not found, flood gradient at default position');
    }
  } catch (error) {
    console.error('[3D Flood] Error moving layer:', error);
  }

  console.log('[3D Flood] Gradient layer added successfully');
  console.log(`[3D Flood] Layer has ${floodGeoJSON.features.length} features`);

  // Log a sample feature for debugging
  if (floodGeoJSON.features.length > 0) {
    const sample = floodGeoJSON.features[0];
    console.log('[3D Flood] Sample feature:', {
      color: sample.properties?.color,
      floodVolume: sample.properties?.floodVolume,
      coordinates: sample.geometry.type === 'LineString' ? sample.geometry.coordinates.length : 0
    });
  }

  // Verify layer visibility
  const visibility = map.getLayoutProperty('flood-gradient-layer', 'visibility');
  console.log(`[3D Flood] Layer visibility after creation: ${visibility}`);

  // Animate the flood appearing if enabled
  if (animate) {
    animateFloodAppearing(map, animationDuration);
  }

  // Store flag
  if (!map.getContainer().dataset.floodActive) {
    map.getContainer().dataset.floodActive = 'true';
  }
}

/**
 * Animate the flood water appearing (gradient lines fade in)
 */
function animateFloodAppearing(map: mapboxgl.Map, duration: number): void {
  const startTime = Date.now();

  const animate = () => {
    // Check if layer still exists before trying to animate
    if (!map.getLayer('flood-gradient-layer')) {
      console.log('[3D Flood] Animation cancelled - layer removed');
      return;
    }

    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function (ease-out cubic)
    const eased = 1 - Math.pow(1 - progress, 3);

    // Fade in the gradient lines with data-driven opacity
    map.setPaintProperty('flood-gradient-layer', 'line-opacity', [
      'interpolate',
      ['linear'],
      ['get', 'floodVolume'],
      0,
      0.4 * eased, // Low volume fades to 0.4
      5,
      0.6 * eased, // Medium volume fades to 0.6
      15,
      0.8 * eased, // High volume fades to 0.8
    ]);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      console.log('[3D Flood] Animation complete');
    }
  };

  console.log('[3D Flood] Starting gradient animation');
  animate();
}

/**
 * Disable flood visualization
 */
export function disableFlood3D(map: mapboxgl.Map): void {
  if (!map) return;

  console.log('[3D Flood] Disabling gradient flood effect');

  // Hide the gradient layer instead of removing it
  if (map.getLayer('flood-gradient-layer')) {
    map.setLayoutProperty('flood-gradient-layer', 'visibility', 'none');
  }

  // Hide old layers for backwards compatibility
  if (map.getLayer('flood-outline-layer')) {
    map.setLayoutProperty('flood-outline-layer', 'visibility', 'none');
  }
  if (map.getLayer('flood-3d-layer')) {
    map.setLayoutProperty('flood-3d-layer', 'visibility', 'none');
  }
}

/**
 * Toggle flood visualization on/off
 */
export function toggleFlood3D(map: mapboxgl.Map, visible: boolean): void {
  if (!map || !map.getLayer('flood-gradient-layer')) return;

  console.log(`[3D Flood] Toggling gradient visibility: ${visible}`);

  const visibility = visible ? 'visible' : 'none';

  map.setLayoutProperty('flood-gradient-layer', 'visibility', visibility);
}
