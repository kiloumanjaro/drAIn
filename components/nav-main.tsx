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
import { usePathname } from 'next/navigation';

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
  const pathname = usePathname();

  const handleNavClick = (e: React.MouseEvent, url: string) => {
    if (url && !isNavigating) {
      e.preventDefault();
      navigateTo(url);
    }
  };

  const isItemActive = (url?: string) => {
    if (!url) return false;
    const urlPath = url.split('?')[0];
    if (urlPath === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(urlPath);
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu className="pl-1">
          {items.map((item) => {
            const active = isItemActive(item.url);
            return (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={item.isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={active}
                    className={active ? 'bg-transparent hover:bg-sidebar-accent' : ''}
                    onClick={(e) => item.url && handleNavClick(e, item.url)}
                  >
                    {item.icon && (
                      <item.icon
                        className={`cursor-pointer ${active ? 'text-[#5a87e7]' : 'text-[#b2adab]'}`}
                      />
                    )}
                    <span className={active ? 'text-[#5a87e7]' : ''}>
                      {item.title}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </Collapsible>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
