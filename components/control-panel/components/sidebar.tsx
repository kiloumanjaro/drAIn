'use client';

import { SideNavigation } from '@/components/control-panel/components/side-navigation';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  profile: Record<string, unknown> | null;
}

export function Sidebar({ activeTab, onTabChange, profile }: SidebarProps) {
  return (
    // A rail down the left of the card; on phones, a tab bar along the bottom
    // of the sheet.
    <div className="flex shrink-0 items-center justify-between border-[#E5DFDC] bg-[#FFF8F5] max-md:order-last max-md:h-14 max-md:w-full max-md:border-t max-md:pb-[env(safe-area-inset-bottom)] md:h-full md:w-11 md:flex-col md:rounded-l-2xl md:border-r md:py-3">
      {/* Logo */}

      <SideNavigation
        activeTab={activeTab}
        onTabChange={onTabChange}
        profile={profile}
      />
    </div>
  );
}
