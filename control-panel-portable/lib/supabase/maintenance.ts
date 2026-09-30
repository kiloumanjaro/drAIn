// Mock of the maintenance data layer for the portable bundle.
// Same export surface as the original; returns empty history / success no-ops.

interface MaintenanceResult {
  success?: boolean;
  data?: unknown;
  error?: string;
}

const recordOk = (): Promise<MaintenanceResult> =>
  Promise.resolve({ success: true, data: {} });

const emptyHistory = (): Promise<MaintenanceResult> =>
  Promise.resolve({ data: [] });

export async function recordInletMaintenance(..._args: unknown[]) {
  return recordOk();
}
export async function getInletMaintenanceHistory(_inletId: string) {
  return emptyHistory();
}
export async function recordManPipeMaintenance(..._args: unknown[]) {
  return recordOk();
}
export async function getManPipeMaintenanceHistory(_manPipeId: string) {
  return emptyHistory();
}
export async function recordOutletMaintenance(..._args: unknown[]) {
  return recordOk();
}
export async function getOutletMaintenanceHistory(_outletId: string) {
  return emptyHistory();
}
export async function recordStormDrainMaintenance(..._args: unknown[]) {
  return recordOk();
}
export async function getStormDrainMaintenanceHistory(_stormDrainId: string) {
  return emptyHistory();
}
