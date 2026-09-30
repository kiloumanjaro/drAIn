'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import {
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
} from '@tabler/icons-react';
import { Play } from 'lucide-react';
import { IconCloud } from '@tabler/icons-react';
import { Spinner } from '@/components/ui/spinner';
import { useSidebar } from '@/components/ui/sidebar';

export function SimulationGateway() {
  const router = useRouter();
  const { setOpen, isMobile, setOpenMobile } = useSidebar();
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleEnterSimulation = () => {
    setIsLoading(true);

    // Close sidebar first
    if (isMobile) {
      setOpenMobile(false);
    } else {
      setOpen(false);
    }

    // Navigate after a delay to ensure sidebar closes
    setTimeout(() => {
      router.push('/simulation?active=true');
    }, 200);
  };

  return (
    <Empty className="flex h-5/6 gap-8">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="border-input !size-13 border">
          {isLoading ? (
            <Spinner className="h-6 w-6" />
          ) : (
            <IconCloud className="h-16 w-16" />
          )}
        </EmptyMedia>
        <EmptyTitle>Simulation Mode</EmptyTitle>
        <EmptyDescription className="text-sm">
          Try out our drainage vulnerability simulation model
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          onClick={handleEnterSimulation}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          disabled={isLoading}
          className="flex h-10 w-32 justify-center"
        >
          {isLoading ? (
            <IconPlayerPauseFilled className="h-4 w-4" />
          ) : isHovered ? (
            <IconPlayerPlayFilled className="h-4 w-4" />
          ) : (
            <Play />
          )}
          Simulate
        </Button>
        {/* <Link
          href="https://github.com/eliseoalcaraz/pjdsc/tree/main/app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm flex flex-row text-muted-foreground hover:text-primary hover:underline underline-offset-4 items-center gap-1"
          className="text-sm flex flex-row text-muted-foreground hover:text-primary hover:underline underline-offset-4 items-center gap-1"
        >
          Learn More
          <ArrowUpRight className="w-4.5 h-4.5" />
        </Link> */}
      </EmptyContent>
    </Empty>
  );
}
