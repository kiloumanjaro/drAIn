import { isComponentType } from '@/lib/supabase/enums';

/**
 * Where a report card leads on the map. The map can select a component from
 * the URL (`component` and `type`) but not a report, so a report with no
 * component opens the map's report tab instead. `formatReport` fills a
 * missing component id with "N/A", which is not a component either.
 */
export function reportMapHref(report: {
  componentId?: string | null;
  category?: string | null;
}): string {
  const { componentId, category } = report;
  if (componentId && componentId !== 'N/A' && isComponentType(category)) {
    const params = new URLSearchParams({
      component: componentId,
      type: category,
    });
    return `/map?${params.toString()}`;
  }
  return '/map?activetab=report';
}
