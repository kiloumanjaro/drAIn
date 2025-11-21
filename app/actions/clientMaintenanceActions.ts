"use client";

import client from "@/app/api/client";
import { updateReportsStatusForComponent } from "@/lib/supabase/report";

// Helper function to normalize Supabase joined data to arrays for TypeScript
// Supabase's select syntax for related tables (e.g., `agencies ( name )`) often
// returns a single object if there's a one-to-one relationship, but TypeScript
// infers it as an array due to potential one-to-many. This function ensures
// it's always an array for type consistency if needed.
const normalizeJoinedData = (data: unknown) => {
  if (!data) return data;

  return (data as Array<Record<string, unknown>>).map((record: Record<string, unknown>) => {
    const newRecord = { ...record };
    if (newRecord.agencies && !Array.isArray(newRecord.agencies)) {
      newRecord.agencies = [newRecord.agencies];
    }
    if (newRecord.profiles && !Array.isArray(newRecord.profiles)) {
      newRecord.profiles = [newRecord.profiles];
    }
    return newRecord;
  });
};

// Inlet Maintenance Functions
export async function recordInletMaintenance(
  inletId: string,
  status?: "in-progress" | "resolved",
  description?: string,
  imagePath?: string,
) {
  return recordMaintenance(
    "inlets_maintenance",
    "in_name",
    inletId,
    status,
    description,
    imagePath,
  );
}

export async function getInletMaintenanceHistory(inletId: string) {
  return getMaintenanceHistory("inlets_maintenance", "in_name", inletId);
}

// Man Pipe Maintenance Functions
export async function recordManPipeMaintenance(
  manPipeId: string,
  status?: "in-progress" | "resolved",
  description?: string,
  imagePath?: string,
) {
  return recordMaintenance(
    "man_pipes_maintenance",
    "name",
    manPipeId,
    status,
    description,
    imagePath,
  );
}

export async function getManPipeMaintenanceHistory(manPipeId: string) {
  return getMaintenanceHistory("man_pipes_maintenance", "name", manPipeId);
}

// Outlet Maintenance Functions
export async function recordOutletMaintenance(
  outletId: string,
  status?: "in-progress" | "resolved",
  description?: string,
  imagePath?: string,
) {
  return recordMaintenance(
    "outlets_maintenance",
    "out_name",
    outletId,
    status,
    description,
    imagePath,
  );
}

export async function getOutletMaintenanceHistory(outletId: string) {
  return getMaintenanceHistory("outlets_maintenance", "out_name", outletId);
}

// Storm Drain Maintenance Functions
export async function recordStormDrainMaintenance(
  stormDrainId: string,
  status?: "in-progress" | "resolved",
  description?: string,
  imagePath?: string,
) {
  return recordMaintenance(
    "storm_drains_maintenance",
    "in_name",
    stormDrainId,
    status,
    description,
    imagePath,
  );
}

export async function getStormDrainMaintenanceHistory(stormDrainId: string) {
  return getMaintenanceHistory(
    "storm_drains_maintenance",
    "in_name",
    stormDrainId,
  );
}

async function recordMaintenance(
  tableName: string,
  idColumn: string,
  assetId: string,
  status?: "in-progress" | "resolved",
  description?: string,
  imagePath?: string,
) {
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to record maintenance." };
  }

  const { data: profile } = await client
    .from("profiles")
    .select("agency_id")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.agency_id) {
    return {
      error: "You must be associated with an agency to record maintenance.",
    };
  }

  const payload: any = {
    [idColumn]: assetId,
    agency_id: profile.agency_id,
    represented_by: user.id,
    status: status,
    description: description,
  };

  if (imagePath) {
    payload.evidence_image = imagePath;
  }

  const { data, error } = await client
    .from(tableName)
    .insert([payload])
    .select();

  if (error) {
    console.error(`Supabase insert error (${tableName}):`, error.message);
    return { error: `Failed to record maintenance for asset ${assetId}.` };
  }

  if (status) {
    await updateReportsStatusForComponent(
      assetId,
      status,
      new Date().toISOString(),
      data[0].id,
      tableName,
      imagePath,
    );
  }

  return { success: true, data: data[0] };
}

async function getMaintenanceHistory(
  tableName: string,
  idColumn: string,
  assetId: string,
) {
  const { data, error } = await client
    .from(tableName)
    .select(
      `
      last_cleaned_at,
      agencies ( name ),
      profiles ( full_name ),
      status,
      addressed_report_id,
      description,
      evidence_image
    `,
    )
    .eq(idColumn, assetId)
    .order("last_cleaned_at", { ascending: false });

  if (error) {
    console.error(`Error fetching history for ${tableName}:`, error.message);
    return { error: `Failed to fetch maintenance history for ${tableName}.` };
  }
  const normalizedData = normalizeJoinedData(data);
  return { data: normalizedData };
}
