import type { CSSProperties } from 'react';
import { isReportStatus, type ReportStatus } from '@/lib/supabase/enums';

/**
 * The one look per report status, the dashboard badge's. Maintenance
 * statuses are a subset ('in-progress', 'resolved'), so they share it.
 */
export const REPORT_STATUS_STYLE: Record<
  ReportStatus,
  { label: string; bgColor: string; borderColor: string; textColor: string }
> = {
  pending: {
    label: 'Pending',
    bgColor: '#ffeee7',
    borderColor: '#ffb8a8',
    textColor: '#ba4723',
  },
  'in-progress': {
    label: 'In Progress',
    bgColor: '#dbf3f7',
    borderColor: '#b1dde0',
    textColor: '#007687',
  },
  resolved: {
    label: 'Resolved',
    bgColor: '#defee7',
    borderColor: '#bedbc7',
    textColor: '#437a56',
  },
};

/** Inline colours for a status badge; a value the database doesn't define looks pending. */
export function statusBadgeCss(status: string): CSSProperties {
  const s = REPORT_STATUS_STYLE[isReportStatus(status) ? status : 'pending'];
  return {
    backgroundColor: s.bgColor,
    borderColor: s.borderColor,
    color: s.textColor,
  };
}
