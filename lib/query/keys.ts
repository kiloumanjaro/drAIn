/**
 * Query key factory for dashboard queries
 * Organized hierarchically for easy cache invalidation
 */
export const dashboardKeys = {
  all: ['dashboard'],
  overview: () => [...dashboardKeys.all, 'overview'],
  analytics: () => [...dashboardKeys.all, 'analytics'],
  analyticsDetails: () => ({
    all: [...dashboardKeys.analytics(), 'details'],
    repairTrend: () => [
      ...dashboardKeys.analytics(),
      'details',
      'repair-trend',
    ],
    issuesPerZone: () => [
      ...dashboardKeys.analytics(),
      'details',
      'issues-per-zone',
    ],
    componentTypes: () => [
      ...dashboardKeys.analytics(),
      'details',
      'component-types',
    ],
    repairTimeByComponent: () => [
      ...dashboardKeys.analytics(),
      'details',
      'repair-time-by-component',
    ],
    allReports: () => [...dashboardKeys.analytics(), 'details', 'all-reports'],
  }),
  reports: () => [...dashboardKeys.all, 'reports'],
  reportsDetails: () => ({
    all: () => [...dashboardKeys.reports(), 'details', 'all'],
  }),
};

/**
 * Query key factory for map queries
 * Organized hierarchically for drainage data and overlays
 */
export const mapKeys = {
  all: ['map'],
  drainage: () => [...mapKeys.all, 'drainage'],
  drainageDetails: () => ({
    all: [...mapKeys.drainage(), 'details'],
    inlets: () => [...mapKeys.drainage(), 'details', 'inlets'],
    outlets: () => [...mapKeys.drainage(), 'details', 'outlets'],
    pipes: () => [...mapKeys.drainage(), 'details', 'pipes'],
    drains: () => [...mapKeys.drainage(), 'details', 'drains'],
  }),
  overlays: () => [...mapKeys.all, 'overlays'],
  overlayDetails: () => ({
    floodHazard: (scenario: string) => [
      ...mapKeys.overlays(),
      'flood-hazard',
      scenario,
    ],
    population: () => [...mapKeys.overlays(), 'population'],
    floodProneAreas: (areaId: string) => [
      ...mapKeys.overlays(),
      'flood-prone',
      areaId,
    ],
  }),
};

/**
 * Query key factory for report queries
 */
export const reportKeys = {
  all: ['reports'],
  lists: () => [...reportKeys.all, 'list'],
  list: (filters?: string) => [...reportKeys.lists(), filters ?? 'all'],
  details: () => [...reportKeys.all, 'details'],
  detail: (id: string) => [...reportKeys.details(), id],
  latest: () => [...reportKeys.all, 'latest'],
  latestPerComponent: () => [...reportKeys.latest(), 'per-component'],
  notifications: () => [...reportKeys.all, 'notifications'],
};
