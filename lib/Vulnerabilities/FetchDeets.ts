import client from '@/app/api/client';

type YearOption = 2 | 5 | 10 | 15 | 20 | 25 | 50 | 100;

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

//Accept a YR parameter to fetch the corresponding table
export const fetchYRTable = async (YR: YearOption): Promise<NodeDetails[]> => {
  try {
    const { data, error } = await client.from(`${YR}YR`).select('*');

    // console.log(data)
    if (error) {
      console.error(`Error fetching ${YR}YR vulnerabilities:`, error);
      throw error;
    }
    const transformedData: NodeDetails[] = data.map((item) => ({
      Node_ID: item.Node_ID,
      Vulnerability_Category: item.Vulnerability_Category,
      Vulnerability_Rank: item.Vulnerability_Rank,
      Cluster: item.Cluster,
      Cluster_Score: item.Cluster_Score,
      YR: item.YR,
      Time_Before_Overflow: item.Time_After_Raining_min,
      Hours_Flooded: item['Hours Flooded'],
      Maximum_Rate: item['Maximum Rate (CMS)'],
      Time_Of_Max_Occurence: item['Time of Max (hr:min)'],
      Total_Flood_Volume: item['Total Flood Volume (10^6 ltr)'],
    }));

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
    const nodeDetails: NodeDetails = {
      Node_ID: data.Node_ID,
      Vulnerability_Category: data.Vulnerability_Category,
      Vulnerability_Rank: data.Vulnerability_Rank,
      Cluster: data.Cluster,
      Cluster_Score: data.Cluster_Score,
      YR: data.YR,
      Time_Before_Overflow: data.Time_After_Raining_min,
      Hours_Flooded: data['Hours Flooded'],
      Maximum_Rate: data['Maximum Rate (CMS)'],
      Time_Of_Max_Occurence: data['Time of Max (hr:min)'],
      Total_Flood_Volume: data['Total Flood Volume (10^6 ltr)'],
    };

    // console.log(nodeDetails);
    return nodeDetails;
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
};
