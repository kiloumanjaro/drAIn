'use client';

import { SideNavigation } from '@/components/control-panel/components/side-navigation';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  profile: Record<string, unknown> | null;
}

export function Sidebar({ activeTab, onTabChange, profile }: SidebarProps) {
  return (
    // A rail down the left of the card; on phones and tablets, a tab bar
    // along the bottom of the sheet.
    <div className="flex shrink-0 items-center justify-between border-[#E5DFDC] bg-[#FFF8F5] max-lg:order-last max-lg:h-14 max-lg:w-full max-lg:border-t max-lg:pb-[env(safe-area-inset-bottom)] lg:h-full lg:w-11 lg:flex-col lg:rounded-l-2xl lg:border-r lg:py-3">
      {/* Logo */}

      <SideNavigation
        activeTab={activeTab}
        onTabChange={onTabChange}
        profile={profile}
      />
    </div>
  );
}
