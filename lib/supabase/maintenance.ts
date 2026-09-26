import client from '@/lib/supabase/client';
import type { Tables } from '@/types/database.types';
import type { ComponentType, MaintenanceStatus } from '@/lib/supabase/enums';

export type { ComponentType, MaintenanceStatus };

/**
 * Record work on a component as the signed-in staff member.
 *
 * The database does the whole job in one transaction (record_maintenance in
 * supabase/schemas): it checks the caller is agency staff, files the record
 * under their agency, and moves the component's open reports along.
 */
export async function recordMaintenance(
  componentType: ComponentType,
  componentName: string,
  status: MaintenanceStatus,
  description?: string,
  imagePath?: string
): Promise<{
  success: boolean;
  data?: Tables<'maintenance'>;
  error?: string;
}> {
  const { data, error } = await client.rpc('record_maintenance', {
    p_component_type: componentType,
    p_component_name: componentName,
    p_status: status,
    p_description: description,
    p_evidence_image: imagePath,
  });

  if (error) {
    console.error('Error recording maintenance:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * A component's maintenance history, newest first, naming the agency and the
 * staff member. Staff only (maintenance_history in supabase/schemas): other
 * users can't read staff profiles. Shaped as the maintenance tab's
 * HistoryItem.
 */
export async function getMaintenanceHistory(componentName: string) {
  const { data, error } = await client.rpc('maintenance_history', {
    p_component_name: componentName,
  });

  if (error) {
    console.error('Error fetching maintenance history:', error.message);
    return { error: 'Failed to fetch maintenance history.' };
  }

  return {
    data: data.map((row) => ({
      last_cleaned_at: row.performed_at,
      agencies: [{ name: row.agency_name }],
      profiles: row.performed_by_name
        ? [{ full_name: row.performed_by_name }]
        : null,
      status: row.status,
      description: row.description,
      evidence_image: row.evidence_image,
    })),
  };
}
