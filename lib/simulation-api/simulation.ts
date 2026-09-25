// swmmApi.ts
import type { NodeDetails } from '@/types/simulation';

import { type HazardLevel, normaliseHazardCategory } from './hazard-category';
import { normaliseOverflowMinutes } from './overflow';

// Import NodeDetails type from vulnerability data table

// Type definitions for the API. Every field is optional, as it is on the
// backend: a field left out keeps the value in the drainage model, so only
// what the user actually set should be sent.
export interface NodeData {
  inv_elev?: number;
  init_depth?: number;
  ponding_area?: number;
  surcharge_depth?: number;
}

export interface LinkData {
  init_flow?: number;
  upstrm_offset_depth?: number;
  downstrm_offset_depth?: number;
  avg_conduit_loss?: number;
}

export interface RainfallData {
  total_precip?: number;
  duration_hr?: number;
}

export interface SimulationRequest {
  nodes?: Record<string, NodeData>;
  links?: Record<string, LinkData>;
  rainfall?: RainfallData;
}

/** Keep only the fields that hold a real number. */
function definedFields<T extends object>(values: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([, value]) => typeof value === 'number' && Number.isFinite(value)
    )
  ) as Partial<T>;
}

/**
 * The request body for a run, carrying only the values that are set.
 *
 * A missing value is left out rather than sent as null or zero: the backend
 * would take a zero literally, and an invert elevation of 0 m is a real,
 * and badly wrong, elevation. NaN is dropped too, since JSON has no NaN and
 * would send it as null.
 */
export function buildSimulationRequest(
  nodes: Record<string, NodeData>,
  links: Record<string, LinkData>,
  rainfall: RainfallData
): SimulationRequest {
  const mapValues = <T extends object>(records: Record<string, T>) =>
    Object.fromEntries(
      Object.entries(records).map(([id, values]) => [id, definedFields(values)])
    );

  return {
    nodes: mapValues(nodes),
    links: mapValues(links),
    rainfall: definedFields(rainfall),
  };
}

export interface NodeSimulationResult {
  Node: string;
  Hours_Flooded: number;
  Maximum_Rate_CMS: number;
  Time_of_Max_days: number;
  Time_of_Max_hr_min: number;
  Total_Flood_Volume_10e6_ltr: number;
  /** Minutes until first overflow, or null if it never overflowed. */
  Time_After_Raining_min: number | null;
  /** Flood hazard: how badly this node floods. 0-1. */
  Vulnerability_Category: string;
  Vulnerability_Score: number;
  /**
   * Exposure: roughly how many people are around it. Always sent; the
   * barangay and its density are null for a node outside every barangay.
   */
  Barangay: string | null;
  Population_Density: number | null;
  /** 0-1. Never null. */
  Exposure_Score: number;
  /** Hazard x exposure. What a work list should rank on. */
  Risk_Score: number;
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
/**
 * Reshape a simulation response into the rows the results table renders.
 *
 * @param nodesList - Per-node results from the backend
 */
export function transformToNodeDetails(
  nodesList: NodeSimulationResult[]
): NodeDetails[] {
  // Rank follows the category, which is authoritative. It used to be
  // thresholded off the raw score at 4/1/0, values the score no longer
  // takes — every node would now come back rank 1 or 2.
  const RANK_BY_LEVEL: Record<HazardLevel, number> = {
    high: 4,
    medium: 3,
    low: 2,
    none: 1,
  };
  const getHazardRank = (category: string): number =>
    RANK_BY_LEVEL[normaliseHazardCategory(category)];

  return nodesList.map((node) => ({
    Node_ID: node.Node,
    Vulnerability_Category: node.Vulnerability_Category,
    Vulnerability_Rank: getHazardRank(node.Vulnerability_Category),
    // The k-means clusters belong to the stored per-return-period
    // scenarios. A live simulation has none, and zero read as a value.
    Cluster: null,
    Cluster_Score: null,
    // A custom storm has no return period. It used to be guessed from the
    // duration alone, which made a 10 mm hour and a 200 mm hour both "10YR"
    // — and that guess was then used to look up real historical data.
    YR: null,
    // Defensive: the stored scenarios predate the change and may still
    // carry the 9999 sentinel rather than null.
    Time_Before_Overflow: normaliseOverflowMinutes(node.Time_After_Raining_min),
    Hours_Flooded: node.Hours_Flooded,
    Maximum_Rate: node.Maximum_Rate_CMS,
    Time_Of_Max_Occurence: node.Time_of_Max_hr_min,
    Total_Flood_Volume: node.Total_Flood_Volume_10e6_ltr,
    Barangay: node.Barangay ?? null,
    Population_Density: node.Population_Density ?? null,
    Exposure_Score: node.Exposure_Score ?? null,
    Risk_Score: node.Risk_Score ?? null,
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
 * Give up after this long. A run is around two minutes, but a job can sit
 * in the backend's queue behind others for 16-30 minutes first; stopping at
 * 10 reported a failure for runs that were still coming. Well past 30 and
 * something is wrong, and we would rather say so than poll forever.
 */
const POLL_TIMEOUT_MS = 30 * 60 * 1000;

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
    body: JSON.stringify(buildSimulationRequest(nodes, links, rainfall)),
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
