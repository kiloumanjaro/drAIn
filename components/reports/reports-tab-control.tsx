'use client';

import { cn } from '@/lib/utils';

interface ReportsTabControlProps {
  activeTab: 'submission' | 'reports';
  onTabChange: (tab: 'submission' | 'reports') => void;
}

export function ReportsTabControl({
  activeTab,
  onTabChange,
}: ReportsTabControlProps) {
  return (
    <div className="flex h-8.5 w-full items-center gap-0 rounded-full border border-[#DCDCDC] bg-[#f7f7f7] p-0.5">
      <button
        onClick={() => onTabChange('submission')}
        className={cn(
          'flex h-full flex-1 cursor-pointer items-center justify-center rounded-full border px-5 py-1 text-xs whitespace-nowrap transition-all',
          activeTab === 'submission'
            ? 'border-[#DCDCDC] bg-white text-gray-900'
            : 'border-transparent bg-transparent text-gray-500 hover:text-gray-700'
        )}
      >
        Submit
      </button>
      <button
        onClick={() => onTabChange('reports')}
        className={cn(
          'flex h-full flex-1 cursor-pointer items-center justify-center rounded-full border px-5 py-1 text-xs whitespace-nowrap transition-all',
          activeTab === 'reports'
            ? 'border-[#DCDCDC] bg-white text-gray-900'
            : 'border-transparent bg-transparent text-gray-500 hover:text-gray-700'
        )}
      >
        View
      </button>
    </div>
  );
}
