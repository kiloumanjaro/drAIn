'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
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
import client from '@/lib/supabase/client';
import { useState, useEffect } from 'react';

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
  const { user } = useAuth();
  const supabase = client;
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [publicAvatarUrl, setPublicAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const cacheKey = `profile-${user.id}`;
      const cachedProfile = localStorage.getItem(cacheKey);

      if (cachedProfile) {
        const { profile: cachedData, publicAvatarUrl: cachedAvatarUrl } =
          JSON.parse(cachedProfile);
        // localStorage is outside React and unavailable during server
        // rendering, so it can only be read here, after mount.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProfile(cachedData);
        setPublicAvatarUrl(cachedAvatarUrl);
      } else {
        const fetchProfile = async () => {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error);
          } else if (data) {
            const avatarUrl = data.avatar_url;
            setProfile(data);
            setPublicAvatarUrl(avatarUrl);
            localStorage.setItem(
              cacheKey,
              JSON.stringify({ profile: data, publicAvatarUrl: avatarUrl })
            );
          }
        };
        fetchProfile();
      }
    }
  }, [user, supabase]);

  const handleLogout = async () => {
    await client.auth.signOut();
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
