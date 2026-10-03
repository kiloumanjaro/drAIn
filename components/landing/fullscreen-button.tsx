'use client';

import { Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function FullscreenButton() {
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(
          `Error attempting to enable full-screen mode: ${err.message} (${err.name})`
        );
      });
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      className="border-gray-300 bg-white/80 shadow-lg transition-colors hover:bg-white"
      onClick={toggleFullScreen}
      aria-label="Toggle Fullscreen"
    >
      <Maximize className="h-5 w-5" />
    </Button>
  );
}
