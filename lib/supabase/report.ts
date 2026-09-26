import client from '@/lib/supabase/client';

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

interface ReportStatusUpdate {
  status: 'in-progress' | 'resolved';
  resolved_by_maintenance_id?: string;
  resolved_by_maintenance_type?: string;
  resolved_image?: string;
}

export const uploadReport = async (
  file: File,
  category: string,
  description: string,
  component_id: string,
  long: number,
  lat: number,
  userId: string | null,
  reporterName: string,
  priority: 'low' | 'medium' | 'high' | 'critical' = 'low'
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

    const formattedReports: Report[] = data.map(
      (report: Record<string, unknown>) => formatReport(report)
    );
    return formattedReports;
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

const _updateReportStatusById = async (
  reportId: string,
  status: 'in-progress' | 'resolved'
) => {
  try {
    const { error } = await client
      .from('reports')
      .update({ status })
      .eq('id', reportId);

    if (error) {
      console.error('Error updating report status:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error updating report status:', error);
    throw error;
  }
};

export const updateReportsStatusForComponent = async (
  componentId: string,
  status: 'in-progress' | 'resolved',
  maintenanceDate: string,
  maintenanceId?: string,
  maintenanceType?: string,
  maintenanceImage?: string
) => {
  try {
    const updates: ReportStatusUpdate = { status };
    if (maintenanceId) updates.resolved_by_maintenance_id = maintenanceId;
    if (maintenanceType) updates.resolved_by_maintenance_type = maintenanceType;
    if (maintenanceImage) updates.resolved_image = maintenanceImage;

    // Hierarchy Logic: Only update reports with a LOWER status.
    // Resolved > In-Progress > Pending
    // - Resolved can update: Pending, In-Progress
    // - In-Progress can update: Pending

    const targetStatuses =
      status === 'resolved' ? ['pending', 'in-progress'] : ['pending'];

    const { error } = await client
      .from('reports')
      .update(updates)
      .eq('component_id', componentId)
      .in('status', targetStatuses)
      .lte('created_at', maintenanceDate);

    if (error) {
      console.error(
        'Error updating multiple report statuses for component:',
        error
      );
      throw error;
    }
  } catch (error) {
    console.error(
      'Error updating multiple report statuses for component:',
      error
    );
    throw error;
  }
};

export const deleteReportsByComponentId = async (componentId: string) => {
  try {
    const { error } = await client
      .from('reports')
      .delete()
      .eq('component_id', componentId);

    if (error) {
      console.error('Error deleting reports:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error deleting reports:', error);
    throw error;
  }
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

  const rawDate = report.created_at ?? report.date ?? null;
  const parsedDate = rawDate ? new Date(rawDate) : null;
  const safeDate =
    !parsedDate || isNaN(parsedDate.getTime())
      ? new Date().toISOString()
      : parsedDate.toISOString();

  const long =
    typeof report.long === 'number'
      ? report.long
      : parseFloat(report.long ?? '');
  const lat =
    typeof report.lat === 'number' ? report.lat : parseFloat(report.lat ?? '');
  const safeCoords: [number, number] =
    !isNaN(long) && !isNaN(lat) ? [long, lat] : [0, 0];

  return {
    id: report.id?.toString() ?? crypto.randomUUID(),
    date: safeDate,
    category: report.category ?? 'Uncategorized',
    description: report.description ?? 'No description provided.',
    image: img?.publicUrl ?? '',
    reporterName: report.reporter_name ?? 'Anonymous',
    status: report.status ?? 'Pending',
    componentId: report.component_id ?? 'N/A',
    coordinates: safeCoords,
    geocoded_status: report.geocoded_status ?? 'pending',
    address: report.address ?? 'Unknown address',
    resolvedByMaintenanceId: report.resolved_by_maintenance_id ?? null,
    resolvedByMaintenanceType: report.resolved_by_maintenance_type ?? null,
    resolvedImage: resolvedImageUrl || null,
  };
};

export function subscribeToReportChanges(
  onInsert?: (r: Report) => void,
  onUpdate?: (r: Report) => void
) {
  const channel = client.channel('reports');

  if (onInsert) {
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'reports' },
      (payload) => {
        onInsert(payload.new as Report);
      }
    );
  }

  if (onUpdate) {
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'reports' },
      (payload) => {
        onUpdate(payload.new as Report);
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
