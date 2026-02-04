'use client';

import { Droplet, Pipette, Wind, CircleDot } from 'lucide-react';
import { formatComponentType } from '@/lib/dashboard/calculations';

interface ComponentTypeBadgeProps {
  componentType: 'inlets' | 'outlets' | 'storm_drains' | 'man_pipes';
  onClick?: (componentType: 'inlets' | 'outlets' | 'storm_drains' | 'man_pipes') => void;
}

export default function ComponentTypeBadge({
  componentType,
  onClick,
}: ComponentTypeBadgeProps) {
  const componentConfigs = {
    inlets: {
      icon: Droplet,
      bgColor: '#e2e6ff',
      textColor: '#5b4fd9',
      borderColor: '#ccd2ea',
    },
    outlets: {
      icon: Wind,
      bgColor: '#f8e4e5',
      textColor: '#a6464c',
      borderColor: '#e0cacd',
    },
    storm_drains: {
      icon: Pipette,
      bgColor: '#fef3c7',
      textColor: '#92400e',
      borderColor: '#fcd34d',
    },
    man_pipes: {
      icon: CircleDot,
      bgColor: '#faf5ff',
      textColor: '#6b21a8',
      borderColor: '#e9d5ff',
    },
  };

  const config = componentConfigs[componentType];
  const IconComponent = config.icon;

  return (
    <div
      onClick={() => onClick?.(componentType)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.(componentType);
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 cursor-pointer"
      style={{
        backgroundColor: config.bgColor,
        borderColor: config.borderColor,
        color: config.textColor,
      }}
    >
      <IconComponent className="h-3.5 w-3.5" />
      {formatComponentType(componentType)}
    </div>
  );
}
