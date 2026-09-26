import {
  getMaintenanceHistory,
  recordMaintenance,
  type ComponentType,
  type MaintenanceStatus,
} from '@/lib/supabase/maintenance';

const actionsFor = (type: ComponentType) => ({
  getHistory: (componentName: string) => getMaintenanceHistory(componentName),
  record: (
    componentName: string,
    status: MaintenanceStatus,
    description?: string,
    imagePath?: string
  ) => recordMaintenance(type, componentName, status, description, imagePath),
});

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
  inlets: actionsFor('inlets'),
  man_pipes: actionsFor('man_pipes'),
  outlets: actionsFor('outlets'),
  storm_drains: actionsFor('storm_drains'),
};
