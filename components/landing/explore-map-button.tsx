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
      className={`text-md pointer-events-auto opacity-100! transition-colors ${
        isClicked ? 'bg-[#2563EB]' : 'bg-[#3B82F6] hover:bg-[#2563EB]'
      } focus:bg-[#2563EB] active:bg-[#2563EB]`}
      onClick={handleClick}
      disabled={isNavigating}
    >
      Explore Map
    </Button>
  );
}
