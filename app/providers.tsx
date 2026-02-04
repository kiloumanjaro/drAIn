'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/query/client';
import { AuthProvider } from '@/components/context/AuthProvider';
import { ReportProvider } from '@/components/context/ReportProvider';
import { NavigationLoadingProvider } from '@/components/context/NavigationLoadingProvider';
import { DashboardProvider } from '@/components/context/DashboardProvider';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AuthProvider>
          <ReportProvider>
            <NavigationLoadingProvider>
              <DashboardProvider>
                <SidebarProvider>{children}</SidebarProvider>
              </DashboardProvider>
            </NavigationLoadingProvider>
          </ReportProvider>
        </AuthProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
