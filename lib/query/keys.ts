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
    reportLocations: () => [
      ...dashboardKeys.analytics(),
      'details',
      'report-locations',
    ],
  }),
  reports: () => [...dashboardKeys.all, 'reports'],
  reportsDetails: () => ({
    page: (filter: object, limit: number) => [
      ...dashboardKeys.reports(),
      'details',
      'page',
      filter,
      limit,
    ],
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
};

/**
 * Query key factory for the signed-in user's profile
 */
export const profileKeys = {
  all: ['profile'],
  detail: (userId: string) => [...profileKeys.all, userId],
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
  countsByDay: () => [...reportKeys.all, 'counts-by-day'],
  countsByComponent: () => [...reportKeys.all, 'counts-by-component'],
  notifications: () => [...reportKeys.all, 'notifications'],
};

/**
 * Query key factory for the simulation page
 */
export const simulationKeys = {
  all: ['simulation'],
  storedTables: () => [...simulationKeys.all, 'stored-table'],
  /** One return period's stored flood results. */
  storedTable: (returnPeriod: number) => [
    ...simulationKeys.storedTables(),
    returnPeriod,
  ],
};
