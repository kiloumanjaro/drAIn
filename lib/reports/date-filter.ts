import { startOfDay, subMonths, subWeeks } from 'date-fns';
import type { DateFilterValue } from '@/components/common/date-sort';

/**
 * The earliest report date a date filter keeps, or null for "all time".
 * `today` starts at the viewer's local midnight.
 */
export function dateFilterCutoff(
  filter: DateFilterValue,
  now: Date = new Date()
): Date | null {
  switch (filter) {
    case 'today':
      return startOfDay(now);
    case 'week':
      return subWeeks(now, 1);
    case '2weeks':
      return subWeeks(now, 2);
    case '3weeks':
      return subWeeks(now, 3);
    case 'month':
      return subMonths(now, 1);
    case 'all':
    default:
      return null;
  }
}
