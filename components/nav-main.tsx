'use client';

import { Collapsible } from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { usePageTransition } from '@/hooks/usePageTransition';

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url?: string;
    icon?: React.ComponentType<{ className?: string }>;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
      icon?: React.ComponentType<{ className?: string }>;
    }[];
  }[];
}) {
  const { navigateTo, isNavigating } = usePageTransition();

  const handleNavClick = (e: React.MouseEvent, url: string) => {
    if (url && !isNavigating) {
      e.preventDefault();
      navigateTo(url);
    }
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu className="pl-1">
          {items.map((item) => (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={item.title}
                  onClick={(e) => item.url && handleNavClick(e, item.url)}
                >
                  {item.icon && (
                    <item.icon className="cursor-pointer text-[#b2adab]" />
                  )}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </Collapsible>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
