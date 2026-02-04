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
