"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

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
  const hasFilters = priority !== "all" || status !== "all" || componentType !== "all";

  return (
    <div className="bg-white rounded-lg border border-[#ced1cd] p-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4 md:items-end">
        {/* Priority Filter */}
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700 block mb-2">
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
          <label className="text-sm font-medium text-gray-700 block mb-2">
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
          <label className="text-sm font-medium text-gray-700 block mb-2">
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
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Clear</span>
          </button>
        )}
      </div>
    </div>
  );
}
