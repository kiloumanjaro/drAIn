import type { Report } from '@/lib/supabase/report';
import {
  fetchAllReports as supabaseFetchAllReports,
  fetchLatestReportsPerComponent as supabaseFetchLatestReports,
} from '@/lib/supabase/report';

/**
 * Query function to fetch all reports
 * Used by TanStack Query
 */
export async function getAllReports(): Promise<Report[]> {
  return await supabaseFetchAllReports();
}

/**
 * Query function to fetch latest reports per component
 * Depends on allReports data
 */
export async function getLatestReportsPerComponent(
  allReports?: Report[]
): Promise<Report[]> {
  return await supabaseFetchLatestReports(allReports);
}
