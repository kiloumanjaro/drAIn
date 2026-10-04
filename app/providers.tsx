'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/query/client';
import { AuthProvider } from '@/components/context/auth-provider';
import { NavigationLoadingProvider } from '@/components/context/navigation-loading-provider';
import { ThemeProvider } from 'next-themes';
import { MotionConfig } from 'framer-motion';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AuthProvider>
          {/* Animations follow the system's reduced-motion setting. */}
          <MotionConfig reducedMotion="user">
            <NavigationLoadingProvider>{children}</NavigationLoadingProvider>
          </MotionConfig>
        </AuthProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
