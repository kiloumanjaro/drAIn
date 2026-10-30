/**
 * Words for the database's names ("storm_drains", "in-progress"), for the
 * panel's lists. The wording is the dashboard's own, so the two agree; a
 * value the database doesn't define is shown as it came.
 */
import {
  formatComponentType,
  getStatusBadgeStyle,
} from '@/lib/dashboard/calculations';
import { isComponentType, isReportStatus } from '@/lib/supabase/enums';

/** "storm_drains" -> "Drains". */
export function componentTypeLabel(type: string): string {
  return isComponentType(type) ? formatComponentType(type) : type;
}

/** "in-progress" -> "In Progress". Covers maintenance statuses too. */
export function statusLabel(status: string): string {
  return isReportStatus(status) ? getStatusBadgeStyle(status).label : status;
}
