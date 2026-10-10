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
        className="relative flex cursor-pointer items-center justify-center max-lg:h-full max-lg:flex-1"
      >
        <Icon className="h-5 w-5 text-[#B2ADAB] hover:text-black" />

        {isActive && (
          <div className="absolute bg-[#B2ADAB] max-lg:inset-x-3 max-lg:top-0 max-lg:h-0.5 max-lg:rounded-b-lg lg:right-0 lg:h-9 lg:w-0.5 lg:rounded-l-lg" />
        )}
      </button>
    );
  };

  return (
    // On a tablet the row of tabs keeps to the same width as the content
    // above it (components/control-panel), in the middle of the sheet.
    <div className="flex h-full w-full items-center max-lg:items-stretch md:max-lg:mx-auto md:max-lg:max-w-2xl lg:flex-col lg:pt-1.5">
      {/* Chatbot tab at the top (first in the row on phones and tablets) */}
      <div className="flex w-full flex-col max-lg:contents">
        {chatbotTab && renderTab(chatbotTab)}
      </div>

      {/* Spacer to push other tabs to bottom */}
      <div className="flex-1 max-lg:hidden" />

      {/* Other tabs at the bottom */}
      <div className="flex w-full flex-col gap-5 max-lg:contents">
        {otherTabs.map((tab) => renderTab(tab))}
      </div>
    </div>
  );
}
