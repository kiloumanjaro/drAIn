import client from '@/lib/supabase/client';
import type { Report } from '@/lib/supabase/report';

export interface OverviewMetrics {
  fixedThisMonth: number;
  pendingIssues: number;
  averageRepairDays: number;
  totalAdmins: number;
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
  type: 'inlets' | 'outlets' | 'storm_drains' | 'man_pipes';
  count: number;
}

export interface RepairTimeByComponentData {
  type: 'inlets' | 'outlets' | 'storm_drains' | 'man_pipes';
  averageDays: number;
  resolvedCount?: number;
}

export interface TeamPerformanceData {
  agencyName: string;
  totalIssues: number;
  resolvedIssues: number;
  averageDays: number;
}

export interface ReportWithMetadata extends Report {
  priority: 'low' | 'medium' | 'high' | 'critical';
  zone?: string;
}

interface MaintenanceRecord {
  in_name?: string;
  out_name?: string;
  name?: string;
  last_cleaned_at: string;
}

/** The four per-component-type maintenance tables and their name column. */
const MAINTENANCE_TABLES = [
  { table: 'inlets_maintenance', nameColumn: 'in_name' },
  { table: 'outlets_maintenance', nameColumn: 'out_name' },
  { table: 'storm_drains_maintenance', nameColumn: 'in_name' },
  { table: 'man_pipes_maintenance', nameColumn: 'name' },
] as const;

/**
 * When each component was last cleaned, keyed by component id.
 *
 * Maintenance is split across one table per component type. All four are
 * read at once rather than in sequence, and merged into a single lookup.
 */
async function fetchLastCleanedByComponent(): Promise<Map<string, string>> {
  const results = await Promise.all(
    MAINTENANCE_TABLES.map(
      ({ table, nameColumn }) =>
        client
          .from(table)
          .select(`${nameColumn}, last_cleaned_at`) as unknown as Promise<{
          data: MaintenanceRecord[] | null;
        }>
    )
  );

  const lastCleaned = new Map<string, string>();
  for (const { data } of results) {
    for (const record of data ?? []) {
      const key = record.in_name || record.out_name || record.name || '';
      if (key) {
        lastCleaned.set(key, record.last_cleaned_at);
      }
    }
  }
  return lastCleaned;
}

interface ReportRecord {
  id: string;
  created_at: string;
  component_id: string;
  status: string;
  category?: string;
  zone?: string;
  image?: string;
  description?: string;
  reporter_name?: string;
  long?: string;
  lat?: string;
  geocoded_status?: string;
  address?: string;
  priority?: string;
}

interface ZoneReport {
  zone: string | null;
}

interface CategoryReport {
  category: string | null;
}

/**
 * Get overview metrics: fixed this month, pending, and average repair time
 */
export async function getOverviewMetrics(): Promise<OverviewMetrics> {
  try {
    // Get fixed this month count
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // These four are independent, so they go out together rather than one
    // after another.
    const [
      { data: fixedData },
      { data: pendingData },
      { data: adminData },
      { data: allReports },
    ] = await Promise.all([
      client
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'resolved')
        .gte('created_at', startOfMonth.toISOString()),
      client
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      // Admins are the profiles attached to an agency.
      client
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .not('agency_id', 'is', null),
      client
        .from('reports')
        .select('id, created_at, component_id, status')
        .eq('status', 'resolved')
        .limit(1000), // Capped: repair time is an average, not a total.
    ]);

    let totalDays = 0;
    let resolvedCount = 0;

    if (allReports) {
      const maintenanceMap = await fetchLastCleanedByComponent();

      // Calculate repair days
      allReports.forEach((report: ReportRecord) => {
        const maintenanceDate = maintenanceMap.get(report.component_id);
        if (maintenanceDate) {
          const days =
            (new Date(maintenanceDate).getTime() -
              new Date(report.created_at).getTime()) /
            (1000 * 60 * 60 * 24);
          if (days >= 0) {
            totalDays += days;
            resolvedCount++;
          }
        }
      });
    }

    const averageRepairDays =
      resolvedCount > 0 ? Math.round((totalDays / resolvedCount) * 10) / 10 : 0;

    return {
      fixedThisMonth: fixedData?.length ?? 0,
      pendingIssues: pendingData?.length ?? 0,
      averageRepairDays,
      totalAdmins: adminData?.length ?? 0,
    };
  } catch (error) {
    console.error('Error fetching overview metrics:', error);
    return {
      fixedThisMonth: 0,
      pendingIssues: 0,
      averageRepairDays: 0,
      totalAdmins: 0,
    };
  }
}

/**
 * Get repair time trend for last 30 days
 */
export async function getRepairTrendData(): Promise<RepairTrendData[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: reports } = (await client
      .from('reports')
      .select('id, created_at, component_id, status')
      .eq('status', 'resolved')
      .gte('created_at', thirtyDaysAgo.toISOString())) as {
      data: ReportRecord[] | null;
    };

    if (!reports || reports.length === 0) {
      return [];
    }

    // Fetch maintenance records
    const maintenanceMap = await fetchLastCleanedByComponent();

    // Group by date and calculate average
    const dateMap = new Map<string, { totalDays: number; count: number }>();

    reports.forEach((report: ReportRecord) => {
      const maintenanceDate = maintenanceMap.get(report.component_id);
      if (maintenanceDate) {
        const createdDate = new Date(report.created_at);
        const dateKey = createdDate.toISOString().split('T')[0];

        const days =
          (new Date(maintenanceDate).getTime() -
            new Date(report.created_at).getTime()) /
          (1000 * 60 * 60 * 24);

        if (days >= 0) {
          const existing = dateMap.get(dateKey) ?? {
            totalDays: 0,
            count: 0,
          };
          dateMap.set(dateKey, {
            totalDays: existing.totalDays + days,
            count: existing.count + 1,
          });
        }
      }
    });

    // Convert to array and sort
    const trend = Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        averageDays: Math.round((data.totalDays / data.count) * 10) / 10,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return trend;
  } catch (error) {
    console.error('Error fetching repair trend data:', error);
    return [];
  }
}

/**
 * Get issues per zone for map display
 * Zones are extracted from addresses at the database level using the
 * extract_barangay_from_address() PostgreSQL function
 */
export async function getIssuesPerZone(): Promise<ZoneIssueData[]> {
  try {
    const { data: reports } = (await client
      .from('reports')
      .select('zone')
      .not('zone', 'is', null)) as { data: ZoneReport[] | null }; // Exclude reports with no zone match

    if (!reports || reports.length === 0) {
      return [];
    }

    // Group by zone
    const zoneMap = new Map<string, number>();

    reports.forEach((report: ZoneReport) => {
      if (report.zone) {
        zoneMap.set(report.zone, (zoneMap.get(report.zone) ?? 0) + 1);
      }
    });

    // Convert to array and sort by count descending
    return Array.from(zoneMap.entries())
      .map(([zone, count]) => ({
        zone,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error('Error fetching issues per zone:', error);
    return [];
  }
}

/**
 * Get component type distribution
 */
export async function getComponentTypeData(): Promise<ComponentTypeData[]> {
  try {
    const { data: reports } = (await client
      .from('reports')
      .select('category')) as { data: CategoryReport[] | null };

    if (!reports) {
      return [];
    }

    const componentMap = new Map<string, number>();

    reports.forEach((report: CategoryReport) => {
      const type = report.category;
      if (type) {
        componentMap.set(type, (componentMap.get(type) ?? 0) + 1);
      }
    });

    return Array.from(componentMap.entries()).map(([type, count]) => ({
      type: type as 'inlets' | 'outlets' | 'storm_drains' | 'man_pipes',
      count,
    }));
  } catch (error) {
    console.error('Error fetching component type data:', error);
    return [];
  }
}

/**
 * Get average repair time by component type
 */
export async function getRepairTimeByComponent(): Promise<
  RepairTimeByComponentData[]
> {
  try {
    const { data: reports } = (await client
      .from('reports')
      .select('category, component_id, created_at, status')) as {
      data: ReportRecord[] | null;
    };

    if (!reports) {
      return [];
    }

    // Fetch maintenance records
    const maintenanceMap = await fetchLastCleanedByComponent();

    // Group by component type
    const componentMap = new Map<
      string,
      { totalDays: number; count: number }
    >();

    reports.forEach((report: ReportRecord) => {
      const type = report.category || 'inlets'; // Use category column directly
      const maintenanceDate = maintenanceMap.get(report.component_id);

      if (maintenanceDate) {
        const days =
          (new Date(maintenanceDate).getTime() -
            new Date(report.created_at).getTime()) /
          (1000 * 60 * 60 * 24);

        if (days >= 0) {
          const existing = componentMap.get(type) ?? {
            totalDays: 0,
            count: 0,
          };
          componentMap.set(type, {
            totalDays: existing.totalDays + days,
            count: existing.count + 1,
          });
        }
      }
    });

    return Array.from(componentMap.entries()).map(([type, data]) => ({
      type: type as 'inlets' | 'outlets' | 'storm_drains' | 'man_pipes',
      averageDays: Math.round((data.totalDays / data.count) * 10) / 10,
      resolvedCount: data.count,
    }));
  } catch (error) {
    console.error('Error fetching repair time by component:', error);
    return [];
  }
}

/**
 * Get team performance metrics
 */
export async function getTeamPerformance(): Promise<TeamPerformanceData[]> {
  try {
    // Three queries regardless of how many agencies there are. This used to
    // run two per agency, in sequence, so the round trips grew with the team
    // list.
    const [{ data: agencies }, { data: profiles }] = await Promise.all([
      client.from('agencies').select('id, name') as unknown as Promise<{
        data: Array<{ id: string; name: string }> | null;
      }>,
      client.from('profiles').select('id, agency_id') as unknown as Promise<{
        data: Array<{ id: string; agency_id: string | null }> | null;
      }>,
    ]);

    if (!agencies || !profiles) {
      return [];
    }

    const agencyIdByUser = new Map(
      profiles.map((profile) => [profile.id, profile.agency_id])
    );

    const { data: reports } = (await client
      .from('reports')
      .select('id, status, user_id')
      .in('user_id', [...agencyIdByUser.keys()])) as {
      data: Array<ReportRecord & { user_id: string }> | null;
    };

    const totals = new Map<string, { total: number; resolved: number }>();
    for (const report of reports ?? []) {
      const agencyId = agencyIdByUser.get(report.user_id);
      if (!agencyId) continue;

      const tally = totals.get(agencyId) ?? { total: 0, resolved: 0 };
      tally.total += 1;
      if (report.status === 'resolved') tally.resolved += 1;
      totals.set(agencyId, tally);
    }

    return (
      agencies
        .map((agency) => ({
          agencyName: agency.name,
          totalIssues: totals.get(agency.id)?.total ?? 0,
          resolvedIssues: totals.get(agency.id)?.resolved ?? 0,
          averageDays: 0, // TODO: Calculate from maintenance records
        }))
        // Agencies with nothing reported against them are left out, as before.
        .filter((entry) => entry.totalIssues > 0)
        .sort((a, b) => b.totalIssues - a.totalIssues)
    );
  } catch (error) {
    console.error('Error fetching team performance:', error);
    return [];
  }
}

/**
 * Get all reports with metadata
 */
export async function getAllReports(): Promise<ReportWithMetadata[]> {
  try {
    const { data: reports } = (await client
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })) as {
      data: ReportRecord[] | null;
    };

    if (!reports) return [];

    // Transform database records to match Report interface
    // Map created_at to date field and convert image paths to public URLs
    return reports.map((report: ReportRecord) => {
      // Get public URL for image if it exists
      const { data: img } = report.image
        ? client.storage.from('ReportImage').getPublicUrl(report.image)
        : { data: { publicUrl: '' } };

      return {
        id: report.id,
        date: report.created_at || new Date().toISOString(),
        category: report.category || 'Uncategorized',
        description: report.description || 'No description',
        image: img?.publicUrl || '',
        reporterName: report.reporter_name || 'Anonymous',
        status: report.status || 'pending',
        componentId: report.component_id || '',
        coordinates: [
          parseFloat(report.long || '0') || 0,
          parseFloat(report.lat || '0') || 0,
        ] as [number, number],
        geocoded_status: report.geocoded_status || 'pending',
        address: report.address || 'Unknown',
        priority: report.priority || 'low',
        zone: report.zone,
      } as ReportWithMetadata;
    });
  } catch (error) {
    console.error('Error fetching all reports:', error);
    return [];
  }
}
