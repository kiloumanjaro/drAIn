'use client';

import { Calendar } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type DateFilterValue =
  | 'all'
  | 'today'
  | 'week'
  | '2weeks'
  | '3weeks'
  | 'month';

interface DateSortProps {
  value?: DateFilterValue;
  onValueChange?: (value: DateFilterValue) => void;
  disabled?: boolean;
}

export function DateSort({
  value = 'all',
  onValueChange,
  disabled = false,
}: DateSortProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="h-8.5 w-36 cursor-pointer border-[#DCDCDC] bg-[#EBEBEB] text-xs text-[#8D8D8D]">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-[#8D8D8D]" />
          <SelectValue placeholder="All time" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all" className="text-xs">
          All time
        </SelectItem>
        <SelectItem value="today" className="text-xs">
          Today
        </SelectItem>
        <SelectItem value="week" className="text-xs">
          Last week
        </SelectItem>
        <SelectItem value="2weeks" className="text-xs">
          Last 2 weeks
        </SelectItem>
        <SelectItem value="3weeks" className="text-xs">
          Last 3 weeks
        </SelectItem>
        <SelectItem value="month" className="text-xs">
          Last month
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
