import client from '@/lib/supabase/client';
import type { Tables } from '@/types/database.types';
import type { ComponentType, MaintenanceStatus } from '@/lib/supabase/enums';

export type { ComponentType, MaintenanceStatus };

// Helper function to normalize Supabase joined data to arrays for TypeScript
// Supabase's select syntax for related tables (e.g., `agencies ( name )`) often
// returns a single object if there's a one-to-one relationship, but TypeScript
// infers it as an array due to potential one-to-many. This function ensures
// it's always an array for type consistency if needed.
const normalizeJoinedData = (data: unknown) => {
  if (!data) return data;

  return (data as Array<Record<string, unknown>>).map(
    (record: Record<string, unknown>) => {
      const newRecord = { ...record };
      if (newRecord.agencies && !Array.isArray(newRecord.agencies)) {
        newRecord.agencies = [newRecord.agencies];
      }
      if (newRecord.profiles && !Array.isArray(newRecord.profiles)) {
        newRecord.profiles = [newRecord.profiles];
      }
      return newRecord;
    }
  );
};

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

/** A component's maintenance history, newest first. */
export async function getMaintenanceHistory(componentName: string) {
  const { data, error } = await client
    .from('maintenance')
    .select(
      `
      last_cleaned_at:performed_at,
      agencies ( name ),
      profiles ( full_name ),
      status,
      description,
      evidence_image
    `
    )
    .eq('component_name', componentName)
    .order('performed_at', { ascending: false });

  if (error) {
    console.error('Error fetching maintenance history:', error.message);
    return { error: 'Failed to fetch maintenance history.' };
  }
  const normalizedData = normalizeJoinedData(data);
  return { data: normalizedData };
}
