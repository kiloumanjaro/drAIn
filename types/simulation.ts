/**
 * Per-node results of a vulnerability simulation.
 *
 * This is the shape the backend returns (after `transformToNodeDetails`
 * reshapes a Model 2 response) and the shape every consumer of those results
 * reads — the map effects, the data table, the slideshow and the charts.
 */
export interface NodeDetails {
  Node_ID: string;
  Vulnerability_Category: string;
  Vulnerability_Rank: number;
  Cluster: number;
  Cluster_Score: number;
  /** Rainfall return period, in years. */
  YR: number;
  Time_Before_Overflow: number;
  Hours_Flooded: number;
  Maximum_Rate: number;
  Time_Of_Max_Occurence: number;
  Total_Flood_Volume: number;
}

/** A node resolved to its position on the map. */
export interface NodeCoordinates {
  id: string;
  coordinates: [number, number];
}
