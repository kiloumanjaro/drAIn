'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'text-muted-foreground inline-flex h-10 w-1/2 items-center justify-start gap-0 border-b border-gray-200 bg-[#fcfcfc]',
      className
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'relative inline-flex flex-1 items-center justify-center gap-2 px-4 py-3 text-xs whitespace-nowrap outline-none disabled:pointer-events-none disabled:opacity-50',
      'transition-colors duration-150',
      'bg-[#fcfcfc] text-gray-500',
      'data-[state=active]:bg-[#fcfcfc] data-[state=active]:text-gray-900',
      // Base borders - start with top and remove bottom for all
      'border-t border-t-[#dfdfdf]',
      'border-b-0',
      // Active tab: add blue top accent
      'data-[state=active]:border-t-[7px] data-[state=active]:border-t-[#3F83DB]',
      // First tab (Analytics):
      // - When active: NO left border (outer), has right border (shared)
      // - When inactive: NO left border (outer), NO right border (shared)
      'first:data-[state=active]:border-l-0',
      'first:data-[state=active]:border-r first:data-[state=active]:border-r-[#dfdfdf]',
      'first:[&:not([data-state=active])]:border-l-0',
      'first:[&:not([data-state=active])]:border-r-0',
      // Last tab (All Reports):
      // - When active: has left border (shared) and right border (outer)
      // - When inactive: NO left border (shared), NO right border (outer)
      'last:data-[state=active]:border-l last:data-[state=active]:border-l-[#dfdfdf]',
      'last:data-[state=active]:border-r last:data-[state=active]:border-r-[#dfdfdf]',
      'last:[&:not([data-state=active])]:border-l-0',
      'last:[&:not([data-state=active])]:border-r-0',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'ring-offset-background focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
