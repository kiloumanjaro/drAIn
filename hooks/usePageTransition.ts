'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSidebar } from '@/components/ui/sidebar';
import { useNavigationLoading } from '@/components/context/NavigationLoadingProvider';

export function usePageTransition() {
  const router = useRouter();
  const { setOpen, isMobile, setOpenMobile } = useSidebar();
  const { isNavigating, destination, setNavigationState } =
    useNavigationLoading();

  const navigateTo = useCallback(
    (url: string) => {
      // Close sidebar for smooth transition
      if (isMobile) {
        setOpenMobile(false);
      } else {
        setOpen(false);
      }

      // Show loading state
      setNavigationState(true, url);

      // Small delay to ensure loading UI renders before navigation
      setTimeout(() => {
        router.push(url);
        // Reset loading state after navigation completes
        // The timeout ensures the new page has time to mount
        setTimeout(() => {
          setNavigationState(false, null);
        }, 500);
      }, 300);
    },
    [router, isMobile, setOpen, setOpenMobile, setNavigationState]
  );

  return { isNavigating, destination, navigateTo };
}
