import client from '@/lib/supabase/client';
import type { Tables } from '@/types/database.types';
import {
  isComponentType,
  type ComponentType,
  type ReportPriority,
} from '@/lib/supabase/enums';

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
  priority: ReportPriority = 'low'
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
    const { data, error } = await client
      .from('reports')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching all reports:', error);
      throw error;
    }

    if (!data) return [];

    return data.map(formatReport);
  } catch (error) {
    console.error('Error fetching all reports:', error);
    throw error;
  }
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

export const getreportCategoryCount = async (
  targetCategory: string,
  categoryId: string
): Promise<number> => {
  // Report.category falls back to a display label for rows without one.
  if (!isComponentType(targetCategory)) return 0;
  try {
    const { count: categoryCount } = await client
      .from('reports')
      .select('category', { count: 'exact', head: true })
      .eq('category', targetCategory)
      .eq('component_id', categoryId);

    return categoryCount ?? 0;
  } catch (error) {
    console.error('Error fetching reports:', error);
    return 0;
  }
};
