import client from '@/lib/supabase/client';
import { normaliseOverflowMinutes } from '@/lib/simulation-api/overflow';
import type { NodeDetails } from '@/types/simulation';

type YearOption = 2 | 5 | 10 | 15 | 20 | 25 | 50 | 100;

/** A row of a stored per-return-period table, in its own column names. */
interface StoredScenarioRow {
  Node_ID: string;
  Vulnerability_Category: string;
  Vulnerability_Rank: number;
  Cluster: number | null;
  Cluster_Score: number | null;
  YR: number | null;
  Time_After_Raining_min: number | null;
  'Hours Flooded': number;
  'Maximum Rate (CMS)': number;
  'Time of Max (hr:min)': number;
  'Total Flood Volume (10^6 ltr)': number;
}

/** Reshape a stored scenario row into the rows the results table renders. */
function mapStoredScenarioRow(item: StoredScenarioRow): NodeDetails {
  return {
    Node_ID: item.Node_ID,
    Vulnerability_Category: item.Vulnerability_Category,
    Vulnerability_Rank: item.Vulnerability_Rank,
    Cluster: item.Cluster,
    Cluster_Score: item.Cluster_Score,
    YR: item.YR,
    // These tables predate the backend sending null, and still carry 9999.
    Time_Before_Overflow: normaliseOverflowMinutes(item.Time_After_Raining_min),
    Hours_Flooded: item['Hours Flooded'],
    Maximum_Rate: item['Maximum Rate (CMS)'],
    Time_Of_Max_Occurence: item['Time of Max (hr:min)'],
    Total_Flood_Volume: item['Total Flood Volume (10^6 ltr)'],
  };
}

//Accept a YR parameter to fetch the corresponding table
export const fetchYRTable = async (YR: YearOption): Promise<NodeDetails[]> => {
  try {
    const { data, error } = await client.from(`${YR}YR`).select('*');

    if (error) {
      console.error(`Error fetching ${YR}YR vulnerabilities:`, error);
      throw error;
    }
    const transformedData: NodeDetails[] = (data as StoredScenarioRow[]).map(
      mapStoredScenarioRow
    );

    return transformedData;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

//Accept a Node_ID and YR parameter to fetch the corresponding node details directly from database
export const fetchNodeDeets = async (
  Node_ID: string,
  YR: YearOption
): Promise<NodeDetails | null> => {
  try {
    const { data, error } = await client
      .from(`${YR}YR`)
      .select('*')
      .eq('Node_ID', Node_ID)
      .single();

    if (error) {
      console.error(`Error fetching node ${Node_ID} from ${YR}YR:`, error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Transform the data to match NodeDetails interface
    return mapStoredScenarioRow(data as StoredScenarioRow);
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
};
