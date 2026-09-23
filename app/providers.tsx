'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/query/client';
import { AuthProvider } from '@/components/context/auth-provider';
import { ReportProvider } from '@/components/context/report-provider';
import { NavigationLoadingProvider } from '@/components/context/navigation-loading-provider';
import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AuthProvider>
          <ReportProvider>
            <NavigationLoadingProvider>{children}</NavigationLoadingProvider>
          </ReportProvider>
        </AuthProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
