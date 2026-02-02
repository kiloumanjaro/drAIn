'use client';

import { AuthProvider } from '@/components/context/AuthProvider';
import { ReportProvider } from '@/components/context/ReportProvider';
import { NavigationLoadingProvider } from '@/components/context/NavigationLoadingProvider';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <ReportProvider>
          <NavigationLoadingProvider>
            <SidebarProvider>{children}</SidebarProvider>
          </NavigationLoadingProvider>
        </ReportProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
