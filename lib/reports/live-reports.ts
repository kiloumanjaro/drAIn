/**
 * Whether a page shows live reports: the sidebar's notification bell, the
 * latest-reports query and the realtime channel behind them. The landing
 * page and the docs show none of it, so they open no live connection.
 */
export function showsLiveReports(pathname: string): boolean {
  return (
    pathname !== '/' && pathname !== '/docs' && !pathname.startsWith('/docs/')
  );
}
