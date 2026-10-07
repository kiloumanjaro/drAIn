'use client';

import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: 'pending' | 'in-progress' | 'resolved';
  onClick?: (status: 'pending' | 'in-progress' | 'resolved') => void;
}

export default function StatusBadge({ status, onClick }: StatusBadgeProps) {
  const statusConfigs = {
    'in-progress': {
      label: 'In Progress',
      bgColor: '#dbf3f7',
      borderColor: '#b1dde0',
      textColor: '#007687',
      icon: Clock,
    },
    resolved: {
      label: 'Resolved',
      bgColor: '#defee7',
      borderColor: '#bedbc7',
      textColor: '#437a56',
      icon: CheckCircle2,
    },
    pending: {
      label: 'Pending',
      bgColor: '#ffeee7',
      borderColor: '#ffb8a8',
      textColor: '#ba4723',
      icon: AlertCircle,
    },
  };

  const config = statusConfigs[status];
  const IconComponent = config.icon;

  const content = (
    <>
      <IconComponent aria-hidden="true" className="h-3.5 w-3.5" />
      {config.label}
    </>
  );
  const className =
    'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold';
  const style = {
    backgroundColor: config.bgColor,
    borderColor: config.borderColor,
    color: config.textColor,
  };

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
