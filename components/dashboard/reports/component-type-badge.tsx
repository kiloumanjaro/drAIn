'use client';

import { Droplet, Pipette, Wind, CircleDot } from 'lucide-react';
import { formatComponentType } from '@/lib/dashboard/calculations';

interface ComponentTypeBadgeProps {
  componentType: 'inlets' | 'outlets' | 'storm_drains' | 'man_pipes';
  onClick?: (
    componentType: 'inlets' | 'outlets' | 'storm_drains' | 'man_pipes'
  ) => void;
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

  const content = (
    <>
      <IconComponent aria-hidden="true" className="h-3.5 w-3.5" />
      {formatComponentType(componentType)}
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
        onClick(componentType);
      }}
      aria-label={`Show only ${formatComponentType(componentType)} reports`}
      className={`cursor-pointer transition-opacity hover:opacity-80 ${className}`}
      style={style}
    >
      {content}
    </button>
  );
}
