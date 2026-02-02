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
      'text-muted-foreground inline-flex h-10 w-full items-center justify-start gap-0 border-b border-gray-200 bg-gray-50/50',
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
      'relative inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all outline-none disabled:pointer-events-none disabled:opacity-50',
      'bg-[#f7f7f7] text-gray-500',
      'data-[state=active]:bg-white data-[state=active]:text-gray-900',
      'border-t border-r border-b border-l border-t-[#ced1cd] border-r-[#ced1cd] border-b-[#ced1cd] border-l-[#ced1cd]',
      'first:border-l-0 last:border-r-0 [&:not(:first-child):not(:last-child)]:border-r-0 [&:not(:first-child):not(:last-child)]:border-l-0',
      'data-[state=active]:border-t-[3px] data-[state=active]:border-b-0 data-[state=active]:border-t-[#3F83DB]',
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
