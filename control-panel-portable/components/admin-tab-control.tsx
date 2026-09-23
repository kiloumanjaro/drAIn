'use client';

import { cn } from '@/lib/utils';

interface AdminTabControlProps {
  activeTab: 'maintenance' | 'reports';
  onTabChange: (tab: 'maintenance' | 'reports') => void;
}

export function AdminTabControl({
  activeTab,
  onTabChange,
}: AdminTabControlProps) {
  return (
    <div className="flex h-8.5 w-full items-center gap-0 rounded-full border border-[#DCDCDC] bg-[#f7f7f7] p-0.5">
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
      <button
        onClick={() => onTabChange('maintenance')}
        className={cn(
          'flex h-full flex-1 cursor-pointer items-center justify-center rounded-full border px-5 py-1 text-xs whitespace-nowrap transition-all',
          activeTab === 'maintenance'
            ? 'border-[#DCDCDC] bg-white text-gray-900'
            : 'border-transparent bg-transparent text-gray-500 hover:text-gray-700'
        )}
      >
        Fix
      </button>
    </div>
  );
}
