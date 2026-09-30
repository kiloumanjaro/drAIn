'use client';

import type { SVGProps } from 'react';
import {
  IconSquaresFilled,
  IconFolderFilled,
  IconShieldHalfFilled,
  IconAnalyzeFilled,
  IconUserShield,
} from '@tabler/icons-react';

// Inlined SVGs (originally imported via @svgr/webpack) so the bundle needs no
// svgr config in the target project. They inherit color via `fill="currentColor"`.
const Person = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 428.21 428.23"
    fill="currentColor"
    {...props}
  >
    <path d="m214.1.02C96.05.02,0,96.07,0,214.12s96.05,214.1,214.1,214.1,214.1-96.05,214.1-214.1S332.16.02,214.1.02Zm-51.69,120.25c13.04-13.82,31.39-21.43,51.69-21.43s38.49,7.66,51.58,21.55c13.27,14.08,19.72,33,18.2,53.34-3.05,40.39-34.34,73.33-69.78,73.33s-66.79-32.94-69.78-73.34c-1.51-20.5,4.93-39.49,18.09-53.45Zm51.69,275.02c-48.86.03-95.65-19.73-129.7-54.78,9.65-13.76,21.95-25.46,36.17-34.42,26.24-16.82,59.44-26.08,93.53-26.08s67.29,9.26,93.5,26.08c14.24,8.95,26.54,20.65,36.2,34.42-34.04,35.05-80.83,54.82-129.7,54.78Z" />
  </svg>
);
const Play = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 428.21 428.23"
    fill="currentColor"
    {...props}
  >
    <path d="m203.06.25c29.52-1.41,59.36,3.08,86.98,13.64,51.28,19.22,94.35,59.12,117.61,108.66,21.6,45.27,26.39,98.24,13.38,146.67-8.87,33.75-26.29,65.2-50.13,90.68-23.84,25.7-54.05,45.54-87.28,56.76-46.56,16.08-98.7,15.39-144.78-2.05-51.28-19.02-94.47-58.68-117.93-108.07C6.45,276.49-.71,242.99.06,209.66c.66-37.68,11.62-75.13,31.34-107.24,18.54-30.26,44.7-55.82,75.41-73.61C136.03,11.83,169.33,2.05,203.06.25m-40.02,117.07c-9.14,2.95-14.63,12.92-13.94,22.21.02,51.35,0,102.69,0,154.04.07,10.09,9.72,18.4,19.55,18.4,4.19.02,8.39-1.13,11.89-3.47,42.88-26.41,85.77-52.8,128.68-79.16,2.22-1.4,4.49-2.83,6.18-4.88,7.31-8.07,5.51-22.14-3.62-28.07-44.36-25.98-88.83-51.78-133.2-77.74-4.69-2.58-10.5-3.11-15.55-1.33Z" />
  </svg>
);

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
        className="relative flex cursor-pointer items-center justify-center"
      >
        <Icon className="h-5 w-5 text-[#B2ADAB] hover:text-black" />

        {isActive && (
          <div className="absolute right-0 h-9 w-0.5 rounded-l-lg bg-[#B2ADAB]" />
        )}
      </button>
    );
  };

  return (
    <div className="flex h-full w-full flex-col items-center pt-1.5">
      {/* Chatbot tab at the top */}
      <div className="flex w-full flex-col">
        {chatbotTab && renderTab(chatbotTab)}
      </div>

      {/* Spacer to push other tabs to bottom */}
      <div className="flex-1" />

      {/* Other tabs at the bottom */}
      <div className="flex w-full flex-col gap-5">
        {otherTabs.map((tab) => renderTab(tab))}
      </div>
    </div>
  );
}
