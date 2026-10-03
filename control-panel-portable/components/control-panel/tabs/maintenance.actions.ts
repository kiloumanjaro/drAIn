import {
  recordInletMaintenance,
  getInletMaintenanceHistory,
  recordManPipeMaintenance,
  getManPipeMaintenanceHistory,
  recordOutletMaintenance,
  getOutletMaintenanceHistory,
  recordStormDrainMaintenance,
  getStormDrainMaintenanceHistory,
} from '@/lib/supabase/maintenance';

/**
 * Per-asset-type mapping from a logical asset key (`inlets`, `man_pipes`,
 * `outlets`, `storm_drains`) to its history-fetch + record-submit Supabase
 * helpers.
 *
 * Lives in a separate file from {@link ./maintenance.helpers} so the pure
 * helpers can be imported by unit tests without dragging the Supabase
 * client (and its required env vars) into the test process.
 */
export const assetActions = {
  inlets: {
    getHistory: getInletMaintenanceHistory,
    record: recordInletMaintenance,
  },
  man_pipes: {
    getHistory: getManPipeMaintenanceHistory,
    record: recordManPipeMaintenance,
  },
  outlets: {
    getHistory: getOutletMaintenanceHistory,
    record: recordOutletMaintenance,
  },
  storm_drains: {
    getHistory: getStormDrainMaintenanceHistory,
    record: recordStormDrainMaintenance,
  },
};
