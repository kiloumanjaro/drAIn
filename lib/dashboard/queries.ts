import client from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/supabase/fetch-all';
import {
  formatReport,
  PUBLIC_REPORT_COLUMNS,
  type Report,
} from '@/lib/supabase/report';
import {
  isComponentType,
  isReportPriority,
  isReportStatus,
  type ComponentType,
} from '@/lib/supabase/enums';

/*
 * The dashboard's numbers are computed in the database, by the views and
 * functions in supabase/schemas/schema_dashboard.sql. These functions only
 * read them and rename fields. Counting in the browser used to stop silently
 * at the API's 1,000-row limit, and three different definitions of "repair
 * time" had grown up here; the database now has one (report_repair_days).
 */

export interface OverviewMetrics {
  fixedThisMonth: number;
  pendingIssues: number;
  averageRepairDays: number;
  /** Agency staff and admins. */
  totalAdmins: number;
  /** Of fixedThisMonth, fixes someone other than the crew confirmed. */
  verifiedFixedThisMonth: number;
  /** Finished maintenance nobody has checked yet. */
  awaitingVerification: number;
  fixedTrend?: number[];
  pendingTrend?: number[];
  repairTimeTrend?: number[];
  adminTrend?: number[];
}

export interface RepairTrendData {
  date: string;
  averageDays: number;
}

export interface ZoneIssueData {
  zone: string;
  count: number;
}

export interface ComponentTypeData {
  type: ComponentType;
  count: number;
}

export interface RepairTimeByComponentData {
  type: ComponentType;
  averageDays: number;
  resolvedCount?: number;
}

export interface TeamPerformanceData {
  agencyName: string;
  /** Reports this agency's maintenance has moved along. */
  totalIssues: number;
  resolvedIssues: number;
  /** Of those, the ones not resolved yet. */
  outstandingIssues: number;
  /**
   * Median days from a report being raised to the maintenance that closed
   * it. Median rather than mean: one report left open for a year should not
   * swamp fifty closed in a day. `null` when nothing has been resolved with
   * a linked maintenance record, which is honest about having no figure
   * rather than showing zero.
   */
  medianDaysToResolve: number | null;
  /** Resolved issues whose fix someone other than the crew confirmed. */
  verifiedIssues: number;
}

export interface ReportWithMetadata extends Report {
  zone?: string;
}

const EMPTY_OVERVIEW: OverviewMetrics = {
  fixedThisMonth: 0,
  pendingIssues: 0,
  averageRepairDays: 0,
  totalAdmins: 0,
  verifiedFixedThisMonth: 0,
  awaitingVerification: 0,
};

/**
 * Get overview metrics: fixed this month, pending, average repair time and
 * the number of agency staff.
 */
export async function getOverviewMetrics(): Promise<OverviewMetrics> {
  // "This month" starts at the viewer's local midnight on the 1st.
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data, error } = await client.rpc('dashboard_overview', {
    p_month_start: startOfMonth.toISOString(),
  });

  if (error) {
    console.error('Error fetching overview metrics:', error);
    throw error;
  }
  const row = data?.[0];
  if (!row) return EMPTY_OVERVIEW;

  return {
    fixedThisMonth: row.fixed_this_month,
    pendingIssues: row.pending_issues,
    averageRepairDays: row.average_repair_days,
    totalAdmins: row.total_staff,
    verifiedFixedThisMonth: row.verified_fixed_this_month,
    awaitingVerification: row.awaiting_verification,
  };
}

/**
 * Get repair time trend for last 30 days
 */
export async function getRepairTrendData(): Promise<RepairTrendData[]> {
  const { data, error } = await client.rpc('repair_trend', { p_days: 30 });

  if (error) {
    console.error('Error fetching repair trend data:', error);
    throw error;
  }

  return (data ?? []).map((row) => ({
    date: row.day,
    averageDays: row.average_days,
  }));
}

/**
 * Get issues per zone for map display.
 * A report's zone is its barangay, set from its coordinates by the
 * update_report_zone trigger (see barangay_boundaries).
 */
export async function getIssuesPerZone(): Promise<ZoneIssueData[]> {
  const { data, error } = await client
    .from('report_counts_by_zone')
    .select('zone, report_count')
    .order('report_count', { ascending: false });

  if (error) {
    console.error('Error fetching issues per zone:', error);
    throw error;
  }

  return (data ?? []).flatMap((row) =>
    row.zone ? [{ zone: row.zone, count: row.report_count ?? 0 }] : []
  );
}

/**
 * Get component type distribution
 */
export async function getComponentTypeData(): Promise<ComponentTypeData[]> {
  const { data, error } = await client
    .from('report_counts_by_category')
    .select('category, report_count');

  if (error) {
    console.error('Error fetching component type data:', error);
    throw error;
  }

  return (data ?? []).flatMap((row) =>
    row.category ? [{ type: row.category, count: row.report_count ?? 0 }] : []
  );
}

/**
 * Get average repair time by component type
 */
export async function getRepairTimeByComponent(): Promise<
  RepairTimeByComponentData[]
> {
  const { data, error } = await client
    .from('repair_time_by_component')
    .select('component_type, average_days, resolved_count');

  if (error) {
    console.error('Error fetching repair time by component:', error);
    throw error;
  }

  return (data ?? []).flatMap((row) =>
    row.component_type
      ? [
          {
            type: row.component_type,
            averageDays: row.average_days ?? 0,
            resolvedCount: row.resolved_count ?? 0,
          },
        ]
      : []
  );
}

/**
 * Get team performance metrics
 */
export async function getTeamPerformance(): Promise<TeamPerformanceData[]> {
  const { data, error } = await client
    .from('team_performance')
    .select(
      'agency_name, total_issues, resolved_issues, outstanding_issues, median_days_to_resolve, verified_issues'
    );

  if (error) {
    console.error('Error fetching team performance:', error);
    throw error;
  }

  return (
    (data ?? [])
      .map((row) => ({
        agencyName: row.agency_name ?? 'Unknown agency',
        totalIssues: row.total_issues ?? 0,
        resolvedIssues: row.resolved_issues ?? 0,
        outstandingIssues: row.outstanding_issues ?? 0,
        medianDaysToResolve: row.median_days_to_resolve,
        verifiedIssues: row.verified_issues ?? 0,
      }))
      .filter((entry) => entry.totalIssues > 0)
      // Ordered by what is still open, so the table points at where the
      // work is. It used to lead on total volume, which made the surest
      // way up the list "receive more reports" and the surest way to look
      // good "mark them resolved".
      .sort((a, b) => b.outstandingIssues - a.outstandingIssues)
  );
}

export interface ReportFilter {
  /** 'all' or a report_priority. */
  priority: string;
  /** 'all' or a report_status. */
  status: string;
  /** 'all' or a component_type. */
  componentType: string;
  /** Staff can include reports they rejected (spam, duplicates). */
  includeRejected: boolean;
}

export interface ReportsPage {
  /** Newest first, at most `limit`. */
  reports: ReportWithMetadata[];
  /** Reports matching the filter. */
  matching: number;
  /** Reports before the priority/status/type filters (rejected ones only if included). */
  total: number;
}

/**
 * The dashboard's reports tab: filtered, newest first and cut off in the
 * database, with exact counts for "N of M". It used to download every
 * report and filter in the browser.
 */
export async function getReportsPage(
  filter: ReportFilter,
  limit: number
): Promise<ReportsPage> {
  let matching = client
    .from('reports')
    .select(PUBLIC_REPORT_COLUMNS, { count: 'exact' });
  let all = client.from('reports').select('id', { count: 'exact', head: true });
  if (!filter.includeRejected) {
    matching = matching.neq('review_status', 'rejected');
    all = all.neq('review_status', 'rejected');
  }
  if (isReportPriority(filter.priority)) {
    matching = matching.eq('priority', filter.priority);
  }
  if (isReportStatus(filter.status)) {
    matching = matching.eq('status', filter.status);
  }
  if (isComponentType(filter.componentType)) {
    matching = matching.eq('category', filter.componentType);
  }

  const [page, counted] = await Promise.all([
    matching
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit),
    all,
  ]);
  if (page.error) throw page.error;
  if (counted.error) throw counted.error;

  const reports = (page.data ?? []).map(
    (report): ReportWithMetadata => ({
      ...formatReport(report),
      zone: report.zone ?? undefined,
    })
  );
  return {
    reports,
    matching: page.count ?? reports.length,
    total: counted.count ?? reports.length,
  };
}

/** Where a report was filed, for the dashboard heatmap. */
export interface ReportLocation {
  coordinates: [number, number];
  zone?: string;
}

/**
 * Every report's position (not rejected), for the heatmap: three columns a
 * row instead of the whole report.
 */
export async function getReportLocations(): Promise<ReportLocation[]> {
  const rows = await fetchAllRows((from, to) =>
    client
      .from('reports')
      .select('id, long, lat, zone')
      .neq('review_status', 'rejected')
      .not('long', 'is', null)
      .not('lat', 'is', null)
      .order('id', { ascending: true })
      .range(from, to)
  );
  return rows.flatMap((row) =>
    row.long !== null && row.lat !== null
      ? [
          {
            coordinates: [row.long, row.lat] as [number, number],
            zone: row.zone ?? undefined,
          },
        ]
      : []
  );
}
