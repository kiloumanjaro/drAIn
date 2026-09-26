import client from '@/lib/supabase/client';
import type { Tables } from '@/types/database.types';
import { fetchAllRows } from '@/lib/supabase/fetch-all';
import type {
  ComponentType,
  PhotoLocationCheck,
  ReportPriority,
  ReportReview,
  ReviewVerdict,
} from '@/lib/supabase/enums';
import type { ExifData } from '@/lib/reports/extract-exif';

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
  resolvedImage?: string | null;
  resolvedAt?: string | null;
  priority: ReportPriority;
  /** Null for a report filed while signed out. */
  userId: string | null;
  /** What agency staff made of it. Rejected reports are hidden from the public. */
  reviewStatus: ReportReview;
  reviewNote: string | null;
  /**
   * Where the photo says it was taken, against the component: 'match'
   * (within 100 m), 'mismatch' or 'missing'. Measured by the database from
   * the photo's EXIF, which is easy to edit, so a hint rather than proof.
   */
  photoCheck: PhotoLocationCheck;
  photoDistanceM: number | null;
  photoTakenAt: string | null;
}

/** A reports row as the database returns it (and as realtime sends it). */
export type ReportRow = Tables<'reports'>;

export const uploadReport = async (
  file: File,
  category: ComponentType,
  description: string,
  component_id: string,
  long: number,
  lat: number,
  userId: string | null,
  reporterName: string,
  priority: ReportPriority = 'low',
  /** What the photo's EXIF says about where and when it was taken. */
  photo: ExifData | null = null
) => {
  try {
    // A fresh name per upload. Using the phone's own file name meant a second
    // "image.jpg" silently replaced the first report's photo.
    const extension = file.name.includes('.')
      ? file.name.split('.').pop()!.toLowerCase()
      : 'jpg';
    const imagePath = `public/${crypto.randomUUID()}.${extension}`;

    const { error } = await client.storage
      .from('ReportImage')
      .upload(imagePath, file, {
        cacheControl: '3600',
        contentType: file.type,
      });
    if (error) {
      console.error('Error uploading file:', error);
      throw error;
    }

    const { error: insertError } = await client.from('reports').insert([
      {
        category,
        description,
        image: imagePath,
        reporter_name: reporterName,
        status: 'pending',
        component_id: component_id,
        long: long,
        lat: lat,
        address: null,
        geocoded_status: 'pending',
        user_id: userId ?? null,
        priority: priority,
        // The database measures these against the component and labels the
        // report (photo_check); staff see it when they review.
        photo_lat: photo?.latitude ?? null,
        photo_lon: photo?.longitude ?? null,
        photo_taken_at: photo?.date?.toISOString() ?? null,
      },
    ]);

    if (insertError) {
      console.error('Error inserting report:', insertError);
      throw insertError;
    }
  } catch (error) {
    console.error('Error uploading report:', error);
    throw error;
  }
};

export const fetchAllReports = async (): Promise<Report[]> => {
  try {
    // Every report staff haven't rejected as spam or a duplicate, a page at
    // a time: a single select stops at 1,000 rows.
    const rows = await fetchAllRows((from, to) =>
      client
        .from('reports')
        .select('*')
        .neq('review_status', 'rejected')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
    );
    return rows.map(formatReport);
  } catch (error) {
    console.error('Error fetching all reports:', error);
    throw error;
  }
};

/**
 * The signed-in person's own reports, newest first, including any staff
 * rejected, so they can see why.
 */
export const fetchMyReports = async (userId: string): Promise<Report[]> => {
  const { data, error } = await client
    .from('reports')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching your reports:', error);
    throw error;
  }
  return (data ?? []).map(formatReport);
};

/**
 * Staff confirm a report, or reject it with a reason, and may correct its
 * priority (review_report in supabase/schemas/schema_trust.sql).
 */
export const reviewReport = async (
  reportId: string,
  verdict: Exclude<ReportReview, 'unreviewed'>,
  note?: string,
  priority?: ReportPriority
): Promise<ReportRow> => {
  const { data, error } = await client.rpc('review_report', {
    p_report_id: reportId,
    p_verdict: verdict,
    p_note: note,
    p_priority: priority,
  });
  if (error) throw new Error(error.message);
  return data;
};

/**
 * The reporter says whether the work that closed their report fixed it. "Not
 * fixed" needs a reason and reopens the report (respond_to_resolution in
 * supabase/schemas/schema_trust.sql).
 */
export const respondToResolution = async (
  reportId: string,
  verdict: ReviewVerdict,
  note?: string
): Promise<ReportRow> => {
  const { data, error } = await client.rpc('respond_to_resolution', {
    p_report_id: reportId,
    p_verdict: verdict,
    p_note: note,
  });
  if (error) throw new Error(error.message);
  return data;
};

/**
 * The signed-in person's answers to "was it fixed?", by the report they
 * answered for. Row-level security returns only their own.
 */
export const fetchMyResolutionVerdicts = async (
  userId: string
): Promise<Map<string, ReviewVerdict>> => {
  const { data, error } = await client
    .from('maintenance_reviews')
    .select('report_id, verdict')
    .eq('reviewer_id', userId)
    .not('report_id', 'is', null);
  if (error) {
    console.error('Error fetching your answers:', error);
    return new Map();
  }
  return new Map(
    (data ?? []).flatMap((row) =>
      row.report_id ? [[row.report_id, row.verdict] as const] : []
    )
  );
};

/** The reports filed against one component, oldest first. */
export const fetchReportsForComponent = async (
  componentId: string
): Promise<Report[]> => {
  const { data, error } = await client
    .from('reports')
    .select('*')
    .eq('component_id', componentId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching reports for component:', error);
    throw error;
  }
  return (data ?? []).map(formatReport);
};

export const fetchLatestReportsPerComponent = async (
  allReportsData?: Report[]
): Promise<Report[]> => {
  let reportsToProcess: Report[];

  if (allReportsData) {
    reportsToProcess = allReportsData;
  } else {
    // Fallback: if allReportsData is not provided, fetch all reports
    reportsToProcess = await fetchAllReports();
  }

  if (!reportsToProcess || reportsToProcess.length === 0) return [];

  // Group reports by componentId and find the latest for each
  const latestReportsMap = new Map<string, Report>();

  // Sort data by created_at to ensure the first encountered is the latest per component
  const sortedData = [...reportsToProcess].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  sortedData.forEach((reportData: Report) => {
    const componentId = reportData.componentId as string;

    if (!latestReportsMap.has(componentId)) {
      latestReportsMap.set(componentId, reportData);
    }
  });

  // Convert map values back to an array
  const latestReports = Array.from(latestReportsMap.values());

  return latestReports;
};

export const formatReport = (report: ReportRow): Report => {
  const { data: img } = client.storage
    .from('ReportImage')
    .getPublicUrl(report.image ?? '');

  let resolvedImageUrl = '';
  if (report.resolved_image) {
    const { data: rImg } = client.storage
      .from('ReportImage')
      .getPublicUrl(report.resolved_image);
    resolvedImageUrl = rImg?.publicUrl || '';
  }

  const parsedDate = report.created_at ? new Date(report.created_at) : null;
  const safeDate =
    !parsedDate || isNaN(parsedDate.getTime())
      ? new Date().toISOString()
      : parsedDate.toISOString();

  const safeCoords: [number, number] =
    report.long !== null && report.lat !== null
      ? [report.long, report.lat]
      : [0, 0];

  return {
    id: report.id,
    date: safeDate,
    category: report.category ?? 'Uncategorized',
    description: report.description ?? 'No description provided.',
    image: img?.publicUrl ?? '',
    reporterName: report.reporter_name ?? 'Anonymous',
    status: report.status,
    componentId: report.component_id ?? 'N/A',
    coordinates: safeCoords,
    geocoded_status: report.geocoded_status ?? 'pending',
    address: report.address ?? 'Unknown address',
    resolvedByMaintenanceId: report.resolved_by_maintenance_id ?? null,
    resolvedImage: resolvedImageUrl || null,
    resolvedAt: report.resolved_at,
    priority: report.priority,
    userId: report.user_id,
    reviewStatus: report.review_status,
    reviewNote: report.review_note,
    photoCheck: report.photo_check,
    photoDistanceM: report.photo_distance_m,
    photoTakenAt: report.photo_taken_at,
  };
};

export function subscribeToReportChanges(
  onInsert?: (r: ReportRow) => void,
  onUpdate?: (r: ReportRow) => void
) {
  const channel = client.channel('reports');

  if (onInsert) {
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'reports' },
      (payload) => {
        onInsert(payload.new as ReportRow);
      }
    );
  }

  if (onUpdate) {
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'reports' },
      (payload) => {
        onUpdate(payload.new as ReportRow);
      }
    );
  }

  channel.subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

/**
 * How many reports each component has, keyed by `reportCountKey`. One
 * request for the whole map, instead of one count query per map pin.
 */
export const fetchReportCountsByComponent = async (): Promise<
  Map<string, number>
> => {
  const counts = new Map<string, number>();
  try {
    const rows = await fetchAllRows((from, to) =>
      client
        .from('report_counts_by_component')
        .select('category, component_id, report_count')
        .order('component_id', { ascending: true })
        .order('category', { ascending: true })
        .range(from, to)
    );
    for (const row of rows) {
      if (row.category && row.component_id) {
        counts.set(
          reportCountKey(row.category, row.component_id),
          row.report_count ?? 0
        );
      }
    }
  } catch (error) {
    console.error('Error fetching report counts:', error);
  }
  return counts;
};

export const reportCountKey = (category: string, componentId: string) =>
  `${category}:${componentId}`;
