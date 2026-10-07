'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import Logo from '@/public/icons/logo.svg';
import {
  HomeIcon,
  MapIcon,
  BookOpenIcon,
  BeakerIcon,
  ChartPieIcon,
} from '@heroicons/react/24/solid';

import { NavMain } from '@/components/shell/nav-main';
import { NavUser } from '@/components/shell/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { useAuth } from '@/components/context/auth-provider';
import { signOutAndForgetProfile } from '@/lib/supabase/sign-out';

import NotificationBell from '@/components/shell/report-notif';

// This is the data structure for the sidebar
const data = {
  navMain: [
    {
      title: 'Home',
      url: '/',
      icon: HomeIcon,
    },
    {
      title: 'Map',
      url: '/map',
      icon: MapIcon,
    },
    {
      title: 'Simulation',
      url: '/simulation?active=true',
      icon: BeakerIcon,
    },
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: ChartPieIcon,
    },
    {
      title: 'Documentation',
      url: '/docs',
      icon: BookOpenIcon,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, profile, publicAvatarUrl } = useAuth();

  const handleLogout = async () => {
    await signOutAndForgetProfile(queryClient);
    router.push('/');
  };

  const userData = user
    ? {
        name: String(profile?.full_name || user.email?.split('@')[0] || 'User'),
        email: user.email || 'No email',
        avatar: publicAvatarUrl || undefined,
      }
    : {
        name: 'Guest',
        email: 'Not logged in',
        avatar: undefined,
      };

  return (
    <Sidebar
      className="border-r border-[#2a2a2a]/25"
      collapsible="icon"
      {...props}
    >
      <SidebarHeader
        role="button"
        tabIndex={0}
        aria-label="Go to home"
        className="flex cursor-pointer items-center justify-center border-b py-4"
        onClick={() => router.push('/')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            router.push('/');
          }
        }}
      >
        <Logo className="h-7 w-auto text-[#5a87e7]" />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <div className="flex justify-center px-3 py-2">
        <NotificationBell />
      </div>
      <SidebarFooter className="border-t">
        <NavUser user={userData} onLogout={handleLogout} />
      </SidebarFooter>
    </Sidebar>
  );
}
