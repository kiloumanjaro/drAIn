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
      textColor: '#727272',
      borderColor: '#d6d6d6',
    },
    medium: {
      label: 'Medium Priority',
      icon: Clock,
      bgGradient: 'bg-gradient-to-b from-[#ffffff] to-[#f3f3f3] ',
      textColor: '#727272',
      borderColor: '#d6d6d6',
    },
    high: {
      label: 'High Priority',
      icon: AlertCircle,
      bgGradient: 'bg-gradient-to-b from-[#ffffff] to-[#f3f3f3] ',
      textColor: '#727272',
      borderColor: '#d6d6d6',
    },
    critical: {
      label: 'Critical Priority',
      icon: AlertTriangle,
      bgGradient: 'bg-gradient-to-b from-[#ffffff] to-[#f3f3f3] ',
      textColor: '#727272',
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

  return (
    <div
      onClick={() => onClick?.(priority)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.(priority);
        }
      }}
      className={`inline-flex cursor-pointer items-center rounded-md border font-semibold transition-opacity hover:opacity-80 ${sizeClasses[size]} ${config.bgGradient}`}
      style={{
        color: config.textColor,
        borderColor: config.borderColor,
      }}
    >
      <IconComponent className={iconSizes[size]} />
      {config.label}
    </div>
  );
}
