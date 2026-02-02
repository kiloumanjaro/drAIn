/* eslint-disable */

import client from '@/app/api/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

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

export const uploadReport = async (
  file: File,
  category: string,
  description: string,
  component_id: string,
  long: number,
  lat: number,
  userId: string | null,
  reporterName: string
) => {
  try {
    const { error } = await client.storage
      .from('ReportImage')
      .upload(`public/${file.name}`, file, {
        cacheControl: '3600',
        upsert: true,
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
        image: `public/${file.name}`,
        reporter_name: reporterName,
        status: 'pending',
        component_id: component_id,
        long: long,
        lat: lat,
        address: null,
        geocoded_status: 'pending',
        user_id: userId ?? null,
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
    const updates: any = { status };
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

export const formatReport = (
  report: Record<string, unknown> | Report
): Report => {
  const { data: img } = client.storage
    .from('ReportImage')
    .getPublicUrl((report as any).image || '');

  let resolvedImageUrl = '';
  if ((report as any).resolved_image) {
    const { data: rImg } = client.storage
      .from('ReportImage')
      .getPublicUrl((report as any).resolved_image);
    resolvedImageUrl = rImg?.publicUrl || '';
  }

  const rawDate = (report as any).created_at || (report as any).date || null;
  const parsedDate = new Date(rawDate);
  const safeDate =
    !rawDate || isNaN(parsedDate.getTime())
      ? new Date().toISOString()
      : parsedDate.toISOString();

  const long = parseFloat((report as any).long);
  const lat = parseFloat((report as any).lat);
  const safeCoords =
    !isNaN(long) && !isNaN(lat)
      ? ([long, lat] as [number, number])
      : ([0, 0] as [number, number]);

  return {
    id: (report as any).id?.toString() ?? crypto.randomUUID(),
    date: safeDate,
    category: (report as any).category ?? 'Uncategorized',
    description: (report as any).description ?? 'No description provided.',
    image: img?.publicUrl ?? '',
    reporterName: (report as any).reporter_name ?? 'Anonymous',
    status: (report as any).status ?? 'Pending',
    componentId: (report as any).component_id ?? 'N/A',
    coordinates: safeCoords,
    geocoded_status: (report as any).geocoded_status ?? 'pending',
    address: (report as any).address ?? 'Unknown address',
    resolvedByMaintenanceId: (report as any).resolved_by_maintenance_id ?? null,
    resolvedByMaintenanceType:
      (report as any).resolved_by_maintenance_type ?? null,
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
        // console.log("Channel Insert:", payload.new);
        onInsert(payload.new as Report);
      }
    );
  }

  if (onUpdate) {
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'reports' },
      (payload) => {
        // console.log("Channel Update:", payload.new);
        onUpdate(payload.new as Report);
      }
    );
  }

  channel.subscribe((status, err) => {
    // console.log("Report Channel status:", status, err || "");
  });

  return () => {
    client.removeChannel(channel);
  };
}

export const getreportCategoryCount = async (
  targetCategory: string,
  categoryId: string
): Promise<number> => {
  try {
    const { count: categoryCount, error: _error } = await client
      .from('reports')
      .select('category', { count: 'exact', head: true })
      .eq('category', targetCategory)
      .eq('component_id', categoryId);

    // console.log(targetCategory, categoryId, categoryCount);
    return categoryCount ?? 0;
  } catch (error) {
    console.error('Error fetching reports:', error);
    return 0;
  }
};
