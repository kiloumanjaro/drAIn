import type { Report } from '@/lib/supabase/report';

/**
 * Put a report that realtime says was filed or changed into the
 * latest-per-component list (the map's pins). It becomes its component's pin
 * unless that component already has a newer report.
 *
 * Returns null when the list can't be patched locally and has to be
 * refetched: a rejected report that was its component's pin should give way
 * to that component's next-newest report, which only the database knows.
 */
export function mergeLatestReport(
  latest: Report[],
  changed: Report
): Report[] | null {
  const current = latest.find((r) => r.componentId === changed.componentId);

  if (changed.reviewStatus === 'rejected') {
    return current?.id === changed.id ? null : latest;
  }
  if (
    current &&
    current.id !== changed.id &&
    new Date(current.date) > new Date(changed.date)
  ) {
    return latest;
  }
  return [changed, ...latest.filter((r) => r !== current)];
}
