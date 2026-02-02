'use client';

import * as React from 'react';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

export function TeamSwitcher({
  team,
}: {
  team: {
    name: string;
    logo: React.ElementType;
    plan: string;
  };
}) {
  const { state } = useSidebar();

  return (
    <SidebarMenu className="rounded-md">
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          asChild
          tooltip={state === 'collapsed' ? team.name : undefined}
        >
          <div className="flex flex-row gap-4">
            <div className="text-primary-foreground flex size-12 items-center justify-center rounded-lg">
              <SidebarTrigger />
            </div>
            <div className="flex flex-col gap-0.5 pt-1 leading-none group-data-[collapsible=icon]:hidden">
              <span className="font-semibold">{team.name}</span>
              <span className="text-muted-foreground text-xs">{team.plan}</span>
            </div>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
