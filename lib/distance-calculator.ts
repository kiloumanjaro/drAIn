import distance from '@turf/distance';
import { point } from '@turf/helpers';
import type { Inlet } from '@/components/control-panel/types';
import type { Outlet } from '@/components/control-panel/types';
import type { Pipe } from '@/components/control-panel/types';
import type { Drain } from '@/components/control-panel/types';

interface DistanceResult {
  inletId: string;
  nearestOutlet: string | null;
  distanceToOutlet: number | null;
}

interface DrainDistanceResult {
  drainId: string;
  nearestOutlet: string | null;
  distanceToOutlet: number | null;
}

interface GraphNode {
  id: string;
  coord: [number, number];
}

interface GraphEdge {
  from: string;
  to: string;
  weight: number;
}

class Graph {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge[]> = new Map();

  addNode(id: string, coord: [number, number]) {
    this.nodes.set(id, { id, coord });
    if (!this.edges.has(id)) {
      this.edges.set(id, []);
    }
  }

  addEdge(from: string, to: string, weight: number) {
    if (!this.edges.has(from)) {
      this.edges.set(from, []);
    }
    this.edges.get(from)!.push({ from, to, weight });
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  getEdges(nodeId: string): GraphEdge[] {
    return this.edges.get(nodeId) || [];
  }

  getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }
}

// Dijkstra's shortest path algorithm
function dijkstra(
  graph: Graph,
  startNodeId: string,
  targetNodeIds: Set<string>
): { distance: number; targetId: string } | null {
  const distances = new Map<string, number>();
  const visited = new Set<string>();
  const pq: Array<{ nodeId: string; dist: number }> = [];

  // Initialize distances
  for (const node of graph.getAllNodes()) {
    distances.set(node.id, Infinity);
  }
  distances.set(startNodeId, 0);
  pq.push({ nodeId: startNodeId, dist: 0 });

  while (pq.length > 0) {
    // Get node with minimum distance
    pq.sort((a, b) => a.dist - b.dist);
    const current = pq.shift()!;

    if (visited.has(current.nodeId)) continue;
    visited.add(current.nodeId);

    // Check if we've reached a target
    if (targetNodeIds.has(current.nodeId)) {
      return { distance: current.dist, targetId: current.nodeId };
    }

    // Update distances to neighbors
    const edges = graph.getEdges(current.nodeId);
    for (const edge of edges) {
      if (visited.has(edge.to)) continue;

      const newDist = current.dist + edge.weight;
      const currentDist = distances.get(edge.to) || Infinity;

      if (newDist < currentDist) {
        distances.set(edge.to, newDist);
        pq.push({ nodeId: edge.to, dist: newDist });
      }
    }
  }

  return null;
}

// Build graph from pipe network
function buildPipeGraph(pipes: Pipe[]): Graph {
  const graph = new Graph();
  const coordToNodeId = new Map<string, string>();
  let nodeCounter = 0;

  // Helper to get or create node ID for a coordinate
  const getNodeId = (coord: [number, number]): string => {
    const key = `${coord[0]},${coord[1]}`;
    if (coordToNodeId.has(key)) {
      return coordToNodeId.get(key)!;
    }
    const nodeId = `node_${nodeCounter++}`;
    coordToNodeId.set(key, nodeId);
    graph.addNode(nodeId, coord);
    return nodeId;
  };

  // Build graph from pipes
  for (const pipe of pipes) {
    if (pipe.coordinates.length < 2) continue;

    // Create edges between consecutive points in the pipe
    for (let i = 0; i < pipe.coordinates.length - 1; i++) {
      const fromCoord = pipe.coordinates[i];
      const toCoord = pipe.coordinates[i + 1];

      const fromNodeId = getNodeId(fromCoord);
      const toNodeId = getNodeId(toCoord);

      // Calculate distance between points
      const dist = distance(point(fromCoord), point(toCoord), {
        units: 'meters',
      });

      // Add bidirectional edges (pipes can be traversed both ways)
      graph.addEdge(fromNodeId, toNodeId, dist);
      graph.addEdge(toNodeId, fromNodeId, dist);
    }
  }

  return graph;
}

// Find nearest node in graph to a given point
function findNearestNode(coord: [number, number], graph: Graph): string | null {
  const targetPoint = point(coord);
  let minDist = Infinity;
  let nearestNodeId: string | null = null;

  for (const node of graph.getAllNodes()) {
    const dist = distance(targetPoint, point(node.coord), { units: 'meters' });
    if (dist < minDist) {
      minDist = dist;
      nearestNodeId = node.id;
    }
  }

  return nearestNodeId;
}

/**
 * Calculate the shortest distance from a specific inlet to the nearest outlet
 * using the pipe network as a graph.
 *
 * @param inletId - The ID of the inlet (e.g., "I-3")
 * @param inlets - Array of inlet objects
 * @param outlets - Array of outlet objects
 * @param pipes - Array of pipe objects
 * @returns Distance result with inlet ID, nearest outlet, and distance in meters
 */
export function calculateDistanceToOutlet(
  inletId: string,
  inlets: Inlet[],
  outlets: Outlet[],
  pipes: Pipe[]
): DistanceResult {
  // Find the inlet
  const inlet = inlets.find((i) => i.id === inletId);
  if (!inlet) {
    return { inletId, nearestOutlet: null, distanceToOutlet: null };
  }

  // Build pipe network graph
  const graph = buildPipeGraph(pipes);

  // Find nearest node to inlet
  const inletNodeId = findNearestNode(inlet.coordinates, graph);
  if (!inletNodeId) {
    return { inletId, nearestOutlet: null, distanceToOutlet: null };
  }

  // Find nearest nodes to all outlets
  const outletNodes = new Map<string, string>(); // nodeId -> outletId
  for (const outlet of outlets) {
    const outletNodeId = findNearestNode(outlet.coordinates, graph);
    if (outletNodeId) {
      outletNodes.set(outletNodeId, outlet.id);
    }
  }

  if (outletNodes.size === 0) {
    return { inletId, nearestOutlet: null, distanceToOutlet: null };
  }

  // Run Dijkstra to find shortest path to any outlet
  const result = dijkstra(graph, inletNodeId, new Set(outletNodes.keys()));

  if (!result) {
    return { inletId, nearestOutlet: null, distanceToOutlet: null };
  }

  const nearestOutletId = outletNodes.get(result.targetId);

  return {
    inletId,
    nearestOutlet: nearestOutletId || null,
    distanceToOutlet: result.distance,
  };
}

/**
 * Calculate the shortest distance from a specific storm drain to the nearest outlet
 * using the pipe network as a graph.
 *
 * @param drainId - The ID of the storm drain (e.g., "ISD-1")
 * @param drains - Array of storm drain objects
 * @param outlets - Array of outlet objects
 * @param pipes - Array of pipe objects
 * @returns Distance result with drain ID, nearest outlet, and distance in meters
 */
export function calculateDistanceToOutletForDrain(
  drainId: string,
  drains: Drain[],
  outlets: Outlet[],
  pipes: Pipe[]
): DrainDistanceResult {
  // Find the storm drain
  const drain = drains.find((d) => d.id === drainId);
  if (!drain) {
    return { drainId, nearestOutlet: null, distanceToOutlet: null };
  }

  // Build pipe network graph
  const graph = buildPipeGraph(pipes);

  // Find nearest node to storm drain
  const drainNodeId = findNearestNode(drain.coordinates, graph);
  if (!drainNodeId) {
    return { drainId, nearestOutlet: null, distanceToOutlet: null };
  }

  // Find nearest nodes to all outlets
  const outletNodes = new Map<string, string>(); // nodeId -> outletId
  for (const outlet of outlets) {
    const outletNodeId = findNearestNode(outlet.coordinates, graph);
    if (outletNodeId) {
      outletNodes.set(outletNodeId, outlet.id);
    }
  }

  if (outletNodes.size === 0) {
    return { drainId, nearestOutlet: null, distanceToOutlet: null };
  }

  // Run Dijkstra to find shortest path to any outlet
  const result = dijkstra(graph, drainNodeId, new Set(outletNodes.keys()));

  if (!result) {
    return { drainId, nearestOutlet: null, distanceToOutlet: null };
  }

  const nearestOutletId = outletNodes.get(result.targetId);

  return {
    drainId,
    nearestOutlet: nearestOutletId || null,
    distanceToOutlet: result.distance,
  };
}
