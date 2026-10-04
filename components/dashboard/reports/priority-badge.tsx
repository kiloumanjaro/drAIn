'use client';

import { AlertTriangle, AlertCircle, Clock, Info } from 'lucide-react';

interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high' | 'critical';
  size?: 'sm' | 'md' | 'lg';
  onClick?: (priority: 'low' | 'medium' | 'high' | 'critical') => void;
}

export default function PriorityBadge({
  priority,
  size = 'md',
  onClick,
}: PriorityBadgeProps) {
  const priorityConfigs = {
    low: {
      label: 'Low Priority',
      icon: Info,
      bgGradient: 'bg-gradient-to-b from-[#ffffff] to-[#f3f3f3] ',
      textColor: '#6d6d6d',
      borderColor: '#d6d6d6',
    },
    medium: {
      label: 'Medium Priority',
      icon: Clock,
      bgGradient: 'bg-gradient-to-b from-[#ffffff] to-[#f3f3f3] ',
      textColor: '#6d6d6d',
      borderColor: '#d6d6d6',
    },
    high: {
      label: 'High Priority',
      icon: AlertCircle,
      bgGradient: 'bg-gradient-to-b from-[#ffffff] to-[#f3f3f3] ',
      textColor: '#6d6d6d',
      borderColor: '#d6d6d6',
    },
    critical: {
      label: 'Critical Priority',
      icon: AlertTriangle,
      bgGradient: 'bg-gradient-to-b from-[#ffffff] to-[#f3f3f3] ',
      textColor: '#6d6d6d',
      borderColor: '#d6d6d6',
    },
  };

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-3 py-1.5 text-sm gap-2',
    lg: 'px-4 py-2 text-base gap-2',
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const config = priorityConfigs[priority];
  const IconComponent = config.icon;

  const content = (
    <>
      <IconComponent aria-hidden="true" className={iconSizes[size]} />
      {config.label}
    </>
  );
  const className = `inline-flex items-center rounded-md border font-semibold ${sizeClasses[size]} ${config.bgGradient}`;
  const style = { color: config.textColor, borderColor: config.borderColor };

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
        onClick(priority);
      }}
      aria-label={`Show only ${config.label} reports`}
      className={`cursor-pointer transition-opacity hover:opacity-80 ${className}`}
      style={style}
    >
      {content}
    </button>
  );
}
