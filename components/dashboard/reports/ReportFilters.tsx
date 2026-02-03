'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { X, AlertTriangle, Clock, Settings2 } from 'lucide-react';
import { useState } from 'react';

interface ReportFiltersProps {
  priority: string;
  status: string;
  componentType: string;
  onPriorityChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onComponentTypeChange: (value: string) => void;
  onClear: () => void;
}

export default function ReportFilters({
  priority,
  status,
  componentType,
  onPriorityChange,
  onStatusChange,
  onComponentTypeChange,
  onClear,
}: ReportFiltersProps) {
  const [_openDropdown, setOpenDropdown] = useState<string | null>(null);

  const hasFilters =
    priority !== 'all' || status !== 'all' || componentType !== 'all';

  // Helper functions for button text and icons
  const getPriorityDisplay = () => {
    const iconColor = '#5a87e7';
    const icon = (
      <AlertTriangle className="h-3.5 w-3.5" style={{ color: iconColor }} />
    );
    if (priority === 'all')
      return {
        icon,
        text: (
          <span>
            <span className="font-semibold">Priority</span> is{' '}
            <span className="font-semibold">All</span>
          </span>
        ),
        isSelected: true,
      };

    const priorityMap: Record<string, string> = {
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    };

    const priorityLabel = priorityMap[priority];
    return {
      icon,
      text: (
        <span>
          <span className="font-semibold">Priority</span> is{' '}
          <span className="font-semibold">{priorityLabel}</span>
        </span>
      ),
      isSelected: true,
    };
  };

  const getStatusDisplay = () => {
    const iconColor = '#5a87e7';
    const icon = <Clock className="h-4 w-4" style={{ color: iconColor }} />;
    if (status === 'all')
      return {
        icon,
        text: (
          <span>
            <span className="font-semibold">Status</span> is{' '}
            <span className="font-semibold">All</span>
          </span>
        ),
        isSelected: true,
      };

    const statusMap: Record<string, string> = {
      pending: 'Pending',
      'in-progress': 'In Progress',
      resolved: 'Resolved',
    };

    return {
      icon,
      text: (
        <span>
          <span className="font-semibold">Status</span> is{' '}
          <span className="font-semibold">{statusMap[status]}</span>
        </span>
      ),
      isSelected: true,
    };
  };

  const getTypeDisplay = () => {
    const iconColor = '#5a87e7';
    const icon = <Settings2 className="h-4 w-4" style={{ color: iconColor }} />;
    if (componentType === 'all')
      return {
        icon,
        text: (
          <span>
            <span className="font-semibold">Type</span> is{' '}
            <span className="font-semibold">All</span>
          </span>
        ),
        isSelected: true,
      };

    const typeMap: Record<string, string> = {
      inlets: 'Inlets',
      outlets: 'Outlets',
      storm_drains: 'Storm Drains',
      man_pipes: 'Pipes',
    };

    return {
      icon,
      text: (
        <span>
          <span className="font-semibold">Type</span> is{' '}
          <span className="font-semibold">{typeMap[componentType]}</span>
        </span>
      ),
      isSelected: true,
    };
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        {/* Priority Filter Button */}
        <div className="relative">
          <Select
            value={priority}
            onValueChange={onPriorityChange}
            onOpenChange={(open) => setOpenDropdown(open ? 'priority' : null)}
          >
            <SelectTrigger className="w-auto min-w-fit gap-2 border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50 [&>svg:last-child]:hidden">
              <div className="flex items-center gap-2">
                {getPriorityDisplay().icon}
                <span className="text-gray-700">
                  {getPriorityDisplay().text}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem
                value="critical"
                className="data-[state=checked]:text-[#5a87e7] [&>span>svg]:text-[#5a87e7]"
              >
                Critical
              </SelectItem>
              <SelectItem
                value="high"
                className="data-[state=checked]:text-[#5a87e7] [&>span>svg]:text-[#5a87e7]"
              >
                High
              </SelectItem>
              <SelectItem
                value="medium"
                className="data-[state=checked]:text-[#5a87e7] [&>span>svg]:text-[#5a87e7]"
              >
                Medium
              </SelectItem>
              <SelectItem
                value="low"
                className="data-[state=checked]:text-[#5a87e7] [&>span>svg]:text-[#5a87e7]"
              >
                Low
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter Button */}
        <div className="relative">
          <Select
            value={status}
            onValueChange={onStatusChange}
            onOpenChange={(open) => setOpenDropdown(open ? 'status' : null)}
          >
            <SelectTrigger className="w-auto min-w-fit gap-2 border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50 [&>svg:last-child]:hidden">
              <div className="flex items-center gap-2">
                {getStatusDisplay().icon}
                <span className="text-gray-700">{getStatusDisplay().text}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem
                value="pending"
                className="data-[state=checked]:text-[#5a87e7] [&>span>svg]:text-[#5a87e7]"
              >
                Pending
              </SelectItem>
              <SelectItem
                value="in-progress"
                className="data-[state=checked]:text-[#5a87e7] [&>span>svg]:text-[#5a87e7]"
              >
                In Progress
              </SelectItem>
              <SelectItem
                value="resolved"
                className="data-[state=checked]:text-[#5a87e7] [&>span>svg]:text-[#5a87e7]"
              >
                Resolved
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Type Filter Button */}
        <div className="relative">
          <Select
            value={componentType}
            onValueChange={onComponentTypeChange}
            onOpenChange={(open) => setOpenDropdown(open ? 'type' : null)}
          >
            <SelectTrigger className="w-auto min-w-fit gap-2 border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50 [&>svg:last-child]:hidden">
              <div className="flex items-center gap-2">
                {getTypeDisplay().icon}
                <span className="text-gray-700">{getTypeDisplay().text}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem
                value="inlets"
                className="data-[state=checked]:text-[#5a87e7] [&>span>svg]:text-[#5a87e7]"
              >
                Inlets
              </SelectItem>
              <SelectItem
                value="outlets"
                className="data-[state=checked]:text-[#5a87e7] [&>span>svg]:text-[#5a87e7]"
              >
                Outlets
              </SelectItem>
              <SelectItem
                value="storm_drains"
                className="data-[state=checked]:text-[#5a87e7] [&>span>svg]:text-[#5a87e7]"
              >
                Storm Drains
              </SelectItem>
              <SelectItem
                value="man_pipes"
                className="data-[state=checked]:text-[#5a87e7] [&>span>svg]:text-[#5a87e7]"
              >
                Pipes
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Button */}
        {hasFilters && (
          <button
            onClick={onClear}
            className="ml-auto flex h-9 w-auto min-w-fit items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            <X className="h-3.5 w-3.5" style={{ color: '#5a87e7' }} />
            <span>Clear All</span>
          </button>
        )}
      </div>
    </div>
  );
}
