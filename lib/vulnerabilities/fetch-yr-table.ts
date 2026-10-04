import client from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetch-all';
import { normaliseOverflowMinutes } from '@/lib/simulation-api/overflow';
import type { Tables } from '@/types/database.types';
import type { NodeDetails } from '@/types/simulation';

/** The return periods, in years, that have stored results. */
export type YearOption = 2 | 5 | 10 | 15 | 20 | 25 | 50 | 100;

/** A stored flood result: one node under one return period. */
type FloodResultRow = Tables<'flood_results'>;

/** Reshape a stored flood result into the rows the results table renders. */
function mapFloodResult(row: FloodResultRow): NodeDetails {
  return {
    Node_ID: row.node_id,
    Vulnerability_Category: row.vulnerability_category,
    Vulnerability_Rank: row.vulnerability_rank,
    Cluster: row.cluster,
    Cluster_Score: row.cluster_score,
    YR: row.return_period,
    // These results predate the backend sending null, and still carry 9999.
    Time_Before_Overflow: normaliseOverflowMinutes(row.time_after_raining_min),
    Hours_Flooded: row.hours_flooded,
    Maximum_Rate: row.max_rate_cms,
    Time_Of_Max_Occurence: row.time_of_max,
    Total_Flood_Volume: row.total_flood_volume_megalitres,
  };
}

/** Every node's stored results for one return period. */
export const fetchYRTable = async (YR: YearOption): Promise<NodeDetails[]> => {
  try {
    // 1,369 nodes per period: more than one page, so read them all.
    const rows = await fetchAllRows((from, to) =>
      client
        .from('flood_results')
        .select('*')
        .eq('return_period', YR)
        .order('node_id', { ascending: true })
        .range(from, to)
    );
    return rows.map(mapFloodResult);
  } catch (error) {
    console.error(`Error fetching ${YR}-year flood results:`, error);
    throw error;
  }
};

/** One node's stored results for one return period, or null. */
export const fetchNodeDeets = async (
  Node_ID: string,
  YR: YearOption
): Promise<NodeDetails | null> => {
  const { data, error } = await client
    .from('flood_results')
    .select('*')
    .eq('return_period', YR)
    .eq('node_id', Node_ID)
    .single();

  if (error || !data) {
    if (error) {
      console.error(`Error fetching node ${Node_ID} for ${YR} years:`, error);
    }
    return null;
  }

  return mapFloodResult(data);
};
