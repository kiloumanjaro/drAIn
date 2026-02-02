'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';

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
  const hasFilters =
    priority !== 'all' || status !== 'all' || componentType !== 'all';

  return (
    <div className="mb-6 rounded-lg border border-[#ced1cd] bg-white p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        {/* Priority Filter */}
        <div className="flex-1">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Priority
          </label>
          <Select value={priority} onValueChange={onPriorityChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">🔴 Critical</SelectItem>
              <SelectItem value="high">🟠 High</SelectItem>
              <SelectItem value="medium">🟡 Medium</SelectItem>
              <SelectItem value="low">⚪ Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="flex-1">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Status
          </label>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Component Type Filter */}
        <div className="flex-1">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Component Type
          </label>
          <Select value={componentType} onValueChange={onComponentTypeChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="inlets">Inlets</SelectItem>
              <SelectItem value="outlets">Outlets</SelectItem>
              <SelectItem value="storm_drains">Storm Drains</SelectItem>
              <SelectItem value="man_pipes">Manhole Pipes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Button */}
        {hasFilters && (
          <button
            onClick={onClear}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
          >
            <X className="h-4 w-4" />
            <span>Clear</span>
          </button>
        )}
      </div>
    </div>
  );
}
