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
  /**
   * k-means cluster from the stored per-return-period scenarios. `null` for
   * a live simulation, which does not produce one.
   */
  Cluster: number | null;
  Cluster_Score: number | null;
  /**
   * Rainfall return period, in years, when the results came from a stored
   * scenario built for one. `null` for a custom storm, where the user gave
   * a depth and duration — those do not imply a return period without
   * depth-duration-frequency curves for this location.
   */
  YR: number | null;
  /** Minutes until first overflow, or null if it never overflowed. */
  Time_Before_Overflow: number | null;
  Hours_Flooded: number;
  Maximum_Rate: number;
  Time_Of_Max_Occurence: number;
  Total_Flood_Volume: number;

  /**
   * Exposure and risk. Present for results from a live simulation; absent
   * for the stored per-return-period scenarios, which predate them.
   */
  Barangay?: string | null;
  Population_Density?: number | null;
  /** 0-1, from the population density of the barangay the node sits in. */
  Exposure_Score?: number | null;
  /** Hazard x exposure. Rank work lists on this, not on hazard alone. */
  Risk_Score?: number | null;
}

/** A node resolved to its position on the map. */
export interface NodeCoordinates {
  id: string;
  coordinates: [number, number];
}
