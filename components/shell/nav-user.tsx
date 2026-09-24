'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronsUpDown,
  LogOut,
  User,
  Bell,
  BellRing,
  Github,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

export function NavUser({
  user,
  onLogout,
}: {
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
  onLogout?: () => void;
}) {
  const router = useRouter();
  const { isMobile, state } = useSidebar();
  const isGuest = user.name === 'Guest' || user.email === 'Not logged in';
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const handleNotificationToggle = () => {
    const newState = !notificationsEnabled;
    setNotificationsEnabled(newState);
    if (newState) {
      toast.success('Notifications turned on');
    } else {
      toast.info('Notifications turned off');
    }
  };

  return (
    <SidebarMenu className="rounded-md border border-[#dbdbdb] bg-[#fafafa] p-1">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
              tooltip={state === 'collapsed' ? user.name : undefined}
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {isGuest ? (
              // Guest user menu items
              <>
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => router.push('/login')}>
                    <LogIn />
                    Log in
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/signup')}>
                    <UserPlus />
                    Sign up
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() =>
                      window.open(
                        'https://github.com/eliseoalcaraz/pjdsc',
                        '_blank'
                      )
                    }
                  >
                    <Github className="mr-2 h-4 w-4" />
                    Contribute
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            ) : (
              // Logged-in user menu items
              <>
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => router.push('/map?activetab=profile')}
                  >
                    <User />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleNotificationToggle}>
                    {notificationsEnabled ? (
                      <BellRing className="text-blue-600" />
                    ) : (
                      <Bell />
                    )}
                    Notifications
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout}>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
