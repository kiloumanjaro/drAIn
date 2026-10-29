'use client';

import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import type { ReportStatus } from '@/lib/supabase/enums';
import {
  REPORT_STATUS_STYLE,
  statusBadgeCss,
} from '@/lib/reports/status-style';

interface StatusBadgeProps {
  status: ReportStatus;
  onClick?: (status: ReportStatus) => void;
}

const ICONS = {
  'in-progress': Clock,
  resolved: CheckCircle2,
  pending: AlertCircle,
} as const;

export default function StatusBadge({ status, onClick }: StatusBadgeProps) {
  const config = REPORT_STATUS_STYLE[status];
  const IconComponent = ICONS[status];

  const content = (
    <>
      <IconComponent aria-hidden="true" className="h-3.5 w-3.5" />
      {config.label}
    </>
  );
  const className =
    'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold';
  const style = statusBadgeCss(status);

  // A badge is a control only where clicking it filters the list; elsewhere
  // it is plain text and takes no tab stop.
  if (!onClick) {
    return (
      <span className={className} style={style}>
        {content}
      </span>
    );
  }

  return (
    <button
      type="button"
      // The badge sits inside a card that is itself clickable.
      onClick={(e) => {
        e.stopPropagation();
        onClick(status);
      }}
      aria-label={`Show only ${config.label} reports`}
      className={`cursor-pointer transition-opacity hover:opacity-80 ${className}`}
      style={style}
    >
      {content}
    </button>
  );
}
