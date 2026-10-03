'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  MoreHorizontal,
  Lock,
  LockOpen,
  LogOut,
  Bell,
  BellRing,
  ArrowLeft,
} from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { SearchBar } from '../../search-bar';
import { ComboboxForm } from '../../combobox-form';
import { OverlayToggle } from '../../overlay-toggle';
import {
  ProfileProgress,
  type ProfileStep,
} from '@/components/ui/profile-progress';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { DatasetType } from '../types';
import { LinkBar } from '@/components/link-bar';
import { ReportsTabControl } from '../../reports-tab-control';
import { DateSort, type DateFilterValue } from '../../date-sort';
import { AdminTabControl } from '@/components/admin-tab-control';

interface TopBarProps {
  activeTab: string;
  dataset: DatasetType;
  onDatasetChange: (dataset: DatasetType) => void;
  onSearch: (term: string) => void;
  onBack: () => void;
  hasSelectedItem: boolean;
  selectedItemTitle: string;
  overlaysVisible: boolean;
  onToggleOverlays: (visible: boolean) => void;
  isDragEnabled?: boolean;
  onToggleDrag?: (enabled: boolean) => void;
  onSignOut?: () => void;
  activeReportTab?: 'submission' | 'reports';
  activeAdminTab?: 'maintenance' | 'reports';
  onReportTabChange?: (tab: 'submission' | 'reports') => void;
  onAdminTabChange?: (tab: 'maintenance' | 'reports') => void;
  dateFilter?: DateFilterValue;
  onDateFilterChange?: (value: DateFilterValue) => void;
  onClosePopUps?: () => void;
}

export function TopBar({
  activeTab,
  dataset,
  onDatasetChange,
  onSearch,
  onBack,
  hasSelectedItem,
  selectedItemTitle,
  overlaysVisible,
  onToggleOverlays,
  isDragEnabled = true,
  onToggleDrag,
  onSignOut,
  activeReportTab = 'submission',
  onReportTabChange,
  onAdminTabChange,
  activeAdminTab = 'maintenance',
  dateFilter = 'all',
  onDateFilterChange,
  onClosePopUps,
}: TopBarProps) {
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // map simModel query param to specific links
  const searchParams = useSearchParams();
  const simModel = searchParams?.get('simModel') || null;
  const modelLinkMap: Record<string, string> = {
    model2: 'project-drain.vercel.app/simulation/model2',
    model3: 'project-drain.vercel.app/simulation/model3',
  };
  const simulationLink = simModel
    ? (modelLinkMap[simModel] ?? 'project-drain.vercel.app/simulation')
    : 'project-drain.vercel.app/simulation';

  // Example profile setup steps - replace with actual data
  const profileSteps: ProfileStep[] = [
    {
      title: 'Basic Information',
      description: 'Complete your name',
      completed: true,
    },
    {
      title: 'Profile Picture',
      description: 'Upload a profile picture',
      completed: true,
    },
    {
      title: 'Verification',
      description: 'Verify your email address',
      completed: false,
    },
    {
      title: 'Link',
      description: 'Link your account to an agency for admin features',
      completed: false,
    },
  ];

  const showSearchBar =
    (activeTab === 'stats' && !hasSelectedItem) ||
    activeTab === 'thread' ||
    activeTab === 'overlays';
  const showSettings = activeTab === 'overlays';
  const showToggle = activeTab === 'overlays';
  const showCombobox = activeTab === 'stats' && !hasSelectedItem;
  const showBackButton = hasSelectedItem && activeTab === 'stats';
  const showSignOut = activeTab === 'profile';
  const showNotification = activeTab === 'profile';
  const showProfileProgress = activeTab === 'profile';
  const showLinkBar = activeTab === 'simulations' || activeTab === 'chatbot';
  const showReportTabs = activeTab === 'report';
  const showAdminTab = activeTab === 'admin';
  const showDateSort = activeTab === 'report' || activeTab === 'admin';

  const handleNotificationToggle = (pressed: boolean) => {
    setNotificationsEnabled(pressed);
    if (pressed) {
      toast.success('Notifications turned on');
    } else {
      toast.info('Notifications turned off');
    }
  };

  const router = useRouter();
  const pathname = usePathname();

  // new: remove simModel param handler used by the topbar button
  const clearSimModelParam = () => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('simModel');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const showChangeModelButton = activeTab === 'simulations' && !!simModel;

  return (
    <div className="flex items-center gap-2 p-3 px-4">
      {/* Search Bar */}
      {showSearchBar && <SearchBar onSearch={onSearch} />}

      {/* Settings Button */}
      {showSettings && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8.5 w-8.5 cursor-pointer items-center justify-center rounded-full border border-[#DCDCDC] bg-[#EBEBEB] transition-colors hover:bg-[#E0E0E0]">
              <MoreHorizontal className="h-5 w-5 text-[#8D8D8D]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => onToggleDrag?.(!isDragEnabled)}
              className="cursor-pointer gap-2"
            >
              {isDragEnabled ? (
                <Lock className="h-4 w-4" />
              ) : (
                <LockOpen className="h-4 w-4" />
              )}
              <span>{isDragEnabled ? 'Lock Layout' : 'Unlock Layout'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Toggle Button */}
      {showToggle && (
        <OverlayToggle
          overlaysVisible={overlaysVisible}
          onToggle={onToggleOverlays}
        />
      )}

      {/* Profile Progress */}
      {showProfileProgress && (
        <ProfileProgress
          current={profileSteps.filter((step) => step.completed).length}
          total={profileSteps.length}
          steps={profileSteps}
        />
      )}

      {/* Dataset Selector */}
      {showCombobox && (
        <div className="h-8.5 w-24">
          <ComboboxForm
            value={dataset}
            onSelect={(value) =>
              onDatasetChange(
                value as 'inlets' | 'man_pipes' | 'outlets' | 'storm_drains'
              )
            }
            showSearch={false}
          />
        </div>
      )}

      {/* Back Button */}
      {showBackButton && (
        <button
          className="flex h-8.5 w-8.5 cursor-pointer items-center justify-center rounded-full border border-[#DCDCDC] bg-[#EBEBEB] transition-colors"
          onClick={onBack}
        >
          <ChevronLeft className="pointer-events-none h-5 w-5 text-[#8D8D8D] hover:text-black" />
        </button>
      )}

      {/* Selected Item Title */}
      {showBackButton && (
        <div className="relative flex h-5 w-9/12 cursor-pointer">
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            {selectedItemTitle}
          </span>
        </div>
      )}

      {/* Notification Button */}
      {showNotification && (
        <Toggle
          pressed={notificationsEnabled}
          onPressedChange={handleNotificationToggle}
          className="flex h-8.5 w-8.5 items-center justify-center rounded-full border border-[#DCDCDC] bg-[#EBEBEB] transition-colors hover:bg-[#E0E0E0] data-[state=on]:bg-[#D0D0D0]"
        >
          {notificationsEnabled ? (
            <BellRing className="h-4 w-4 text-[#8D8D8D]" />
          ) : (
            <Bell className="h-4 w-4 text-[#8D8D8D]" />
          )}
        </Toggle>
      )}

      {/* Sign Out Button */}
      {showSignOut && (
        <>
          <button
            onClick={() => setShowSignOutDialog(true)}
            className="flex h-8.5 w-8.5 items-center justify-center rounded-full border border-[#DCDCDC] bg-[#EBEBEB] transition-colors hover:bg-[#E0E0E0]"
          >
            <LogOut className="h-4 w-4 text-[#8D8D8D]" />
          </button>

          <AlertDialog
            open={showSignOutDialog}
            onOpenChange={setShowSignOutDialog}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign Out</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to sign out? You&apos;ll need to log in
                  again to access your account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setShowSignOutDialog(false);
                    onSignOut?.();
                  }}
                >
                  Sign Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {/* Reports Tab */}
      {showReportTabs && onReportTabChange && (
        <div className="flex-10">
          <ReportsTabControl
            activeTab={activeReportTab}
            onTabChange={onReportTabChange}
          />
        </div>
      )}

      {/* Admin Tab */}
      {showAdminTab && onAdminTabChange && (
        <div className="flex-1">
          <AdminTabControl
            activeTab={activeAdminTab}
            onTabChange={onAdminTabChange}
          />
        </div>
      )}

      {/* small icon-only change-model button (shows when a model is selected) */}
      {showChangeModelButton && (
        <button
          onClick={() => {
            clearSimModelParam();
            onClosePopUps?.();
          }}
          className="flex h-8.5 w-8.5 items-center justify-center rounded-full border border-[#DCDCDC] bg-[#EBEBEB] transition-colors hover:bg-[#E0E0E0]"
          aria-label="Change Model"
        >
          <ArrowLeft className="h-4 w-4 cursor-pointer text-[#8D8D8D]" />
        </button>
      )}

      {/* Link Bar */}
      {showLinkBar && (
        <div className="h-8.5 flex-1">
          <LinkBar link={simulationLink} />
        </div>
      )}

      {/* Date Sort */}
      {showDateSort && (
        <div className="h-8.5">
          <DateSort
            value={dateFilter}
            onValueChange={onDateFilterChange}
            disabled={
              (activeReportTab === 'submission' && activeTab === 'report') ||
              (activeAdminTab === 'maintenance' && activeTab === 'admin')
            }
          />
        </div>
      )}
    </div>
  );
}
