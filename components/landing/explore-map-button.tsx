'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePageTransition } from '@/hooks/use-page-transition';

export function ExploreMapButton() {
  const { navigateTo, isNavigating } = usePageTransition();
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = () => {
    setIsClicked(true);
    navigateTo('/map');
  };

  return (
    <Button
      size="lg"
      className={`pointer-events-auto text-base opacity-100! transition-colors ${
        isClicked ? 'bg-[#1D4ED8]' : 'bg-[#2563EB] hover:bg-[#1D4ED8]'
      } focus:bg-[#1D4ED8] active:bg-[#1D4ED8]`}
      onClick={handleClick}
      disabled={isNavigating}
    >
      Explore Map
    </Button>
  );
}
