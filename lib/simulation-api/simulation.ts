// swmmApi.ts
import type { NodeDetails } from '@/types/simulation';

// Import NodeDetails type from vulnerability data table

// Type definitions for the API
export interface NodeData {
  inv_elev: number;
  init_depth: number;
  ponding_area: number;
  surcharge_depth: number;
}

export interface LinkData {
  init_flow: number;
  upstrm_offset_depth: number;
  downstrm_offset_depth: number;
  avg_conduit_loss: number;
}

export interface RainfallData {
  total_precip: number;
  duration_hr: number;
}

export interface SimulationRequest {
  nodes: Record<string, NodeData>;
  links: Record<string, LinkData>;
  rainfall: RainfallData;
}

export interface NodeSimulationResult {
  Node: string;
  Hours_Flooded: number;
  Maximum_Rate_CMS: number;
  Time_of_Max_days: number;
  Time_of_Max_hr_min: number;
  Total_Flood_Volume_10e6_ltr: number;
  Time_After_Raining_min: number;
  Vulnerability_Category: string;
  Vulnerability_Score: number;
}

export interface SimulationResponse {
  nodes_list: NodeSimulationResult[];
  [key: string]: unknown; // Additional fields
}

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;

/**
 * Run SWMM simulation with provided network and rainfall data
 * @param nodes - Dictionary of node IDs and their properties
 * @param links - Dictionary of link IDs and their properties
 * @param rainfall - Rainfall data (total precipitation and duration)
 * @returns Simulation results including flooding summary
 */
/**
 * Transform Model 2 simulation results to NodeDetails format for vulnerability table
 * @param nodesList - Array of node simulation results from Model 2 API
 * @param rainfallDuration - Duration in hours to approximate year return period
 * @returns Array of NodeDetails for vulnerability table
 */
export function transformToNodeDetails(
  nodesList: NodeSimulationResult[],
  rainfallDuration: number = 1
): NodeDetails[] {
  // Helper to calculate vulnerability rank from score
  const getVulnerabilityRank = (score: number): number => {
    if (score > 4) return 4; // High
    if (score > 1) return 3; // Medium
    if (score > 0) return 2; // Low
    return 1; // No risk
  };

  // Helper to approximate YR from rainfall duration
  const approximateYR = (durationHr: number): number => {
    // Simple mapping: 1hr -> 10YR, 2hr -> 25YR, 3hr+ -> 50YR
    if (durationHr <= 1) return 10;
    if (durationHr <= 2) return 25;
    return 50;
  };

  return nodesList.map((node) => ({
    Node_ID: node.Node,
    Vulnerability_Category: node.Vulnerability_Category,
    Vulnerability_Rank: getVulnerabilityRank(node.Vulnerability_Score),
    Cluster: 0, // Not provided by Model 2 API
    Cluster_Score: 0, // Not provided by Model 2 API
    YR: approximateYR(rainfallDuration),
    Time_Before_Overflow: node.Time_After_Raining_min,
    Hours_Flooded: node.Hours_Flooded,
    Maximum_Rate: node.Maximum_Rate_CMS,
    Time_Of_Max_Occurence: node.Time_of_Max_hr_min,
    Total_Flood_Volume: node.Total_Flood_Volume_10e6_ltr,
  }));
}

/** Job lifecycle reported by the backend. */
export type SimulationJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

interface JobAccepted {
  job_id: string;
  status: SimulationJobStatus;
  poll_url: string;
}

interface JobState {
  job_id: string;
  status: SimulationJobStatus;
  result: SimulationResponse | null;
  error: string | null;
}

/** How often to poll, unless the server asks for something else. */
const DEFAULT_POLL_INTERVAL_MS = 3000;

/**
 * Give up after this long. A run is around two minutes; well past that and
 * something is wrong, and we would rather say so than poll forever.
 */
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

function apiBaseUrl(): string {
  return API_BASE_URL?.replace(/\/$/, '') || '';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Seconds the server asked us to wait, in ms, or the default. */
function retryAfterMs(response: Response): number {
  const header = Number(response.headers.get('Retry-After'));
  return Number.isFinite(header) && header > 0
    ? header * 1000
    : DEFAULT_POLL_INTERVAL_MS;
}

/**
 * Run a SWMM simulation and resolve with its results.
 *
 * A run takes minutes, so the backend queues it and we poll: the request
 * that starts it returns straight away. `onStatus` reports each transition
 * for callers that want to show progress.
 */
export async function runSimulation(
  nodes: Record<string, NodeData>,
  links: Record<string, LinkData>,
  rainfall: RainfallData,
  onStatus?: (status: SimulationJobStatus) => void
): Promise<SimulationResponse> {
  const created = await fetch(`${apiBaseUrl()}/simulations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodes, links, rainfall }),
  });

  if (created.status === 429) {
    throw new Error(
      'The simulation server is busy with other runs. Please try again shortly.'
    );
  }
  if (!created.ok) {
    throw new Error(`Could not start the simulation (HTTP ${created.status}).`);
  }

  const job = (await created.json()) as JobAccepted;
  onStatus?.(job.status);

  let interval = retryAfterMs(created);
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let lastStatus: SimulationJobStatus = job.status;

  while (Date.now() < deadline) {
    await delay(interval);

    const polled = await fetch(`${apiBaseUrl()}${job.poll_url}`);
    if (polled.status === 404) {
      throw new Error('The simulation result expired before it was read.');
    }
    if (!polled.ok) {
      throw new Error(
        `Could not read the simulation's progress (HTTP ${polled.status}).`
      );
    }

    const state = (await polled.json()) as JobState;
    if (state.status !== lastStatus) {
      lastStatus = state.status;
      onStatus?.(state.status);
    }

    if (state.status === 'succeeded') {
      if (!state.result) {
        throw new Error(
          'The simulation reported success but returned nothing.'
        );
      }
      return state.result;
    }
    if (state.status === 'failed') {
      throw new Error(state.error ?? 'The simulation failed.');
    }

    interval = retryAfterMs(polled);
  }

  throw new Error('The simulation did not finish in time.');
}
