// Mock of the reports data layer for the portable bundle.
// Same export surface as the original Supabase-backed module, but returns static
// demo data and no-ops. Replace this file with your own data source to go live.

export interface Report {
  id: string;
  date: string;
  category: string;
  description: string;
  image: string;
  reporterName: string;
  status: string;
  componentId: string;
  coordinates: [number, number];
  geocoded_status: string;
  address: string;
  resolvedByMaintenanceId?: string | null;
  resolvedByMaintenanceType?: string | null;
  resolvedImage?: string | null;
}

export interface ReportRow {
  id?: string | number | null;
  created_at?: string | null;
  date?: string | null;
  category?: string | null;
  description?: string | null;
  image?: string | null;
  reporter_name?: string | null;
  status?: string | null;
  component_id?: string | null;
  long?: string | number | null;
  lat?: string | number | null;
  geocoded_status?: string | null;
  address?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'critical' | null;
  resolved_by_maintenance_id?: string | null;
  resolved_by_maintenance_type?: string | null;
  resolved_image?: string | null;
}

// Local placeholder image so report cards render without remote-image config.
const PLACEHOLDER_IMAGE = '/icons/person.svg';

export const MOCK_REPORTS: Report[] = [
  {
    id: 'rep-1',
    date: '2026-06-20T08:30:00.000Z',
    category: 'inlets',
    description: 'Inlet grate clogged with debris after heavy rain.',
    image: PLACEHOLDER_IMAGE,
    reporterName: 'Maria Santos',
    status: 'pending',
    componentId: 'INL-001',
    coordinates: [123.9417, 10.3296],
    geocoded_status: 'success',
    address: 'A. del Rosario St, Mandaue City',
    resolvedByMaintenanceId: null,
    resolvedByMaintenanceType: null,
    resolvedImage: null,
  },
  {
    id: 'rep-2',
    date: '2026-06-18T14:10:00.000Z',
    category: 'storm_drains',
    description: 'Standing water around storm drain, slow drainage.',
    image: PLACEHOLDER_IMAGE,
    reporterName: 'Juan Dela Cruz',
    status: 'in-progress',
    componentId: 'DRN-001',
    coordinates: [123.9385, 10.3331],
    geocoded_status: 'success',
    address: 'M.C. Briones St, Mandaue City',
    resolvedByMaintenanceId: null,
    resolvedByMaintenanceType: null,
    resolvedImage: null,
  },
  {
    id: 'rep-3',
    date: '2026-06-12T09:00:00.000Z',
    category: 'outlets',
    description: 'Outlet flap gate stuck, possible backflow.',
    image: PLACEHOLDER_IMAGE,
    reporterName: 'Ana Reyes',
    status: 'resolved',
    componentId: 'OUT-001',
    coordinates: [123.9462, 10.3258],
    geocoded_status: 'success',
    address: 'Plaridel St, Mandaue City',
    resolvedByMaintenanceId: 'mnt-9',
    resolvedByMaintenanceType: 'outlets_maintenance',
    resolvedImage: PLACEHOLDER_IMAGE,
  },
  {
    id: 'rep-4',
    date: '2026-06-22T17:45:00.000Z',
    category: 'man_pipes',
    description: 'Cracked pipe section reported near the highway.',
    image: PLACEHOLDER_IMAGE,
    reporterName: 'Carlos Lim',
    status: 'pending',
    componentId: 'PIPE-001',
    coordinates: [123.9402, 10.331],
    geocoded_status: 'success',
    address: 'Cebu North Rd, Mandaue City',
    resolvedByMaintenanceId: null,
    resolvedByMaintenanceType: null,
    resolvedImage: null,
  },
];

export const uploadReport = async (..._args: unknown[]): Promise<void> => {
  // no-op in the portable bundle
};

export const fetchAllReports = async (): Promise<Report[]> => MOCK_REPORTS;

export const fetchLatestReportsPerComponent = async (
  allReportsData?: Report[]
): Promise<Report[]> => {
  const source = allReportsData ?? MOCK_REPORTS;
  const latest = new Map<string, Report>();
  [...source]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .forEach((r) => {
      if (!latest.has(r.componentId)) latest.set(r.componentId, r);
    });
  return Array.from(latest.values());
};

export const updateReportsStatusForComponent = async (
  ..._args: unknown[]
): Promise<void> => {
  // no-op
};

export const deleteReportsByComponentId = async (
  _componentId: string
): Promise<void> => {
  // no-op
};

export const formatReport = (report: ReportRow): Report => ({
  id: report.id?.toString() ?? 'mock-id',
  date: report.created_at ?? report.date ?? new Date(0).toISOString(),
  category: report.category ?? 'Uncategorized',
  description: report.description ?? 'No description provided.',
  image: PLACEHOLDER_IMAGE,
  reporterName: report.reporter_name ?? 'Anonymous',
  status: report.status ?? 'Pending',
  componentId: report.component_id ?? 'N/A',
  coordinates: [Number(report.long) || 0, Number(report.lat) || 0],
  geocoded_status: report.geocoded_status ?? 'pending',
  address: report.address ?? 'Unknown address',
  resolvedByMaintenanceId: report.resolved_by_maintenance_id ?? null,
  resolvedByMaintenanceType: report.resolved_by_maintenance_type ?? null,
  resolvedImage: report.resolved_image ?? null,
});

export function subscribeToReportChanges(
  _onInsert?: (r: Report) => void,
  _onUpdate?: (r: Report) => void
) {
  // no realtime in the portable bundle
  return () => {};
}

export const getreportCategoryCount = async (
  _targetCategory: string,
  _categoryId: string
): Promise<number> => 0;
