'use client';

import { SideNavigation } from '@/components/side-navigation';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  profile: Record<string, unknown> | null;
}

export function Sidebar({ activeTab, onTabChange, profile }: SidebarProps) {
  return (
    <div className="flex h-full w-11 flex-col items-center justify-between rounded-l-2xl border-r border-[#E5DFDC] bg-[#FFF8F5] py-3">
      {/* Logo */}

      <SideNavigation
        activeTab={activeTab}
        onTabChange={onTabChange}
        profile={profile}
      />
    </div>
  );
}
