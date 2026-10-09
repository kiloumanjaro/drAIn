'use client';

import Person from '@/public/icons/person.svg';
import Play from '@/public/icons/play.svg';
import {
  IconSquaresFilled,
  IconFolderFilled,
  IconShieldHalfFilled,
  IconAnalyzeFilled,
  IconUserShield,
} from '@tabler/icons-react';

interface SideNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  profile: Record<string, unknown> | null;
}

export function SideNavigation({
  activeTab,
  onTabChange,
  profile: _profile,
}: SideNavigationProps) {
  const baseTabs = [
    { id: 'chatbot', label: 'Chatbot', icon: IconAnalyzeFilled },
    { id: 'overlays', label: 'Overlay', icon: IconSquaresFilled },
    { id: 'stats', label: 'Stats', icon: IconFolderFilled },
    { id: 'simulations', label: 'Simulations', icon: Play },
    { id: 'report', label: 'Report', icon: IconShieldHalfFilled },
    { id: 'admin', label: 'Admin', icon: IconUserShield },
    { id: 'profile', label: 'Profile', icon: Person },
  ];

  // if (profile?.agency_id) {
  //   const adminTabIndex = baseTabs.findIndex((tab) => tab.id === "profile");
  //   baseTabs.splice(adminTabIndex, 0, {
  //     id: "admin",
  //     label: "Admin",
  //     icon: IconUserShield,
  //   });
  // }

  const chatbotTab = baseTabs.find((tab) => tab.id === 'chatbot');
  const otherTabs = baseTabs.filter((tab) => tab.id !== 'chatbot');

  const renderTab = (tab: (typeof baseTabs)[0]) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        aria-label={tab.label}
        aria-current={isActive ? 'true' : undefined}
        className="relative flex cursor-pointer items-center justify-center max-md:h-full max-md:flex-1"
      >
        <Icon className="h-5 w-5 text-[#B2ADAB] hover:text-black" />

        {isActive && (
          <div className="absolute bg-[#B2ADAB] max-md:inset-x-3 max-md:top-0 max-md:h-0.5 max-md:rounded-b-lg md:right-0 md:h-9 md:w-0.5 md:rounded-l-lg" />
        )}
      </button>
    );
  };

  return (
    <div className="flex h-full w-full items-center max-md:items-stretch md:flex-col md:pt-1.5">
      {/* Chatbot tab at the top (first in the row on phones) */}
      <div className="flex w-full flex-col max-md:contents">
        {chatbotTab && renderTab(chatbotTab)}
      </div>

      {/* Spacer to push other tabs to bottom */}
      <div className="flex-1 max-md:hidden" />

      {/* Other tabs at the bottom */}
      <div className="flex w-full flex-col gap-5 max-md:contents">
        {otherTabs.map((tab) => renderTab(tab))}
      </div>
    </div>
  );
}
