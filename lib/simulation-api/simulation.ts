// swmmApi.ts

// Import NodeDetails type from vulnerability data table
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
const API_BASE_URL = process.env.NEXT_PUBLIC_RAILWAY_URL!;

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

export async function runSimulation(
  nodes: Record<string, NodeData>,
  links: Record<string, LinkData>,
  rainfall: RainfallData
): Promise<SimulationResponse> {
  // console.log(nodes)
  // console.log(links)
  // console.log(rainfall)
  try {
    // Ensure proper URL construction (remove trailing slash from base URL if present)
    const baseUrl = API_BASE_URL?.replace(/\/$/, '') || '';
    const response = await fetch(`${baseUrl}/run-simulation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nodes,
        links,
        rainfall,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error running simulation:', error);
    throw error;
  }
}
