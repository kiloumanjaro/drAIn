"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Logo from "@/public/icons/logo.svg";
import { IconArticleFilled } from "@tabler/icons-react";
import {
  HomeIcon,
  MapIcon,
  BookOpenIcon,
  BeakerIcon,
  ChartPieIcon,
} from "@heroicons/react/24/solid";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useAuth } from "@/components/context/AuthProvider";
import client from "@/app/api/client";
import { useState, useEffect } from "react";

import NotificationBell from "@/components/report-notif";

// This is the data structure for the sidebar
const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: ChartPieIcon,
    },
    {
      title: "Home",
      url: "/",
      icon: HomeIcon,
    },
    {
      title: "Map",
      url: "/map",
      icon: MapIcon,
    },
    {
      title: "Simulation",
      url: "/simulation?active=true",
      icon: BeakerIcon,
    },
    {
      title: "Documentation",
      url: "/docs",
      icon: BookOpenIcon,
    },
    {
      title: "About",
      url: "/about",
      icon: IconArticleFilled,
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
        setProfile(cachedData);
        setPublicAvatarUrl(cachedAvatarUrl);
      } else {
        const fetchProfile = async () => {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

          if (error && error.code !== "PGRST116") {
            console.error("Error fetching profile:", error);
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
    router.push("/");
  };

  const userData = user
    ? {
        name: String(profile?.full_name || user.email?.split("@")[0] || "User"),
        email: user.email || "No email",
        avatar: publicAvatarUrl || undefined,
      }
    : {
        name: "Guest",
        email: "Not logged in",
        avatar: undefined,
      };

  return (
    <Sidebar
      className="border-r border-[#2a2a2a]/25"
      collapsible="icon"
      {...props}
    >
      <SidebarHeader
        className="border-b flex items-center justify-center py-4 cursor-pointer"
        onClick={() => router.push("/")}
      >
        <Logo className="h-7 w-auto text-[#5a87e7]" />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <div className="px-3 py-2 flex justify-center">
        <NotificationBell />
      </div>
      <SidebarFooter className="border-t">
        <NavUser user={userData} onLogout={handleLogout} />
      </SidebarFooter>
    </Sidebar>
  );
}
