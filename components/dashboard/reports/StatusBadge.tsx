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
      textColor: '#008ca0',
      icon: Clock,
    },
    resolved: {
      label: 'Resolved',
      bgColor: '#defee7',
      borderColor: '#bedbc7',
      textColor: '#4e8f65',
      icon: CheckCircle2,
    },
    pending: {
      label: 'Pending',
      bgColor: '#ffeee7',
      borderColor: '#ffb8a8',
      textColor: '#ff6230',
      icon: AlertCircle,
    },
  };

  const config = statusConfigs[status];
  const IconComponent = config.icon;

  return (
    <button
      onClick={() => onClick?.(status)}
      className="inline-flex items-center gap-1.5 rounded-md border px-2 text-xs font-semibold transition-opacity hover:opacity-80 cursor-pointer"
      style={{
        backgroundColor: config.bgColor,
        borderColor: config.borderColor,
        color: config.textColor,
      }}
    >
      <IconComponent className="h-3.5 w-3.5" />
      {config.label}
    </button>
  );
}
