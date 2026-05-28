'use client';

import { LoadingScreen } from '@/components/loading-screen';
import { useNavigationLoading } from '@/components/context/NavigationLoadingProvider';
import {
  IconMap,
  IconFlask,
  IconBook,
  IconInfoCircle,
} from '@tabler/icons-react';

// Page-specific loading configurations
const loadingConfig: Record<
  string,
  {
    title: string;
    messages: string[];
    icon: React.ReactNode;
  }
> = {
  '/map': {
    title: 'Loading Map',
    messages: [
      'Loading interactive map...',
      'Initializing 3D terrain...',
      'Fetching drainage data...',
      'Loading report markers...',
    ],
    icon: <IconMap className="h-4 w-4 text-white" />,
  },
  '/simulation': {
    title: 'Entering Simulation',
    messages: [
      'Entering simulation mode...',
      'Loading vulnerability models...',
      'Preparing analysis tools...',
      'Initializing parameters...',
    ],
    icon: <IconFlask className="h-4 w-4 text-white" />,
  },
  '/docs': {
    title: 'Loading Documentation',
    messages: [
      'Loading documentation...',
      'Fetching guides and resources...',
      'Preparing content...',
      'Almost ready...',
    ],
    icon: <IconBook className="h-4 w-4 text-white" />,
  },
  '/about': {
    title: 'Loading About',
    messages: [
      'Loading about page...',
      'Fetching project information...',
      'Preparing content...',
      'Almost there...',
    ],
    icon: <IconInfoCircle className="h-4 w-4 text-white" />,
  },
  '/': {
    title: 'Loading Home',
    messages: [
      'Returning to home...',
      'Loading dashboard...',
      'Preparing interface...',
      'Almost ready...',
    ],
    icon: <IconInfoCircle className="h-4 w-4 text-white" />,
  },
};

export function NavigationLoadingOverlay() {
  const { isNavigating, destination } = useNavigationLoading();

  if (!isNavigating || !destination) {
    return null;
  }

  // Get the base path without query parameters
  const basePath = destination.split('?')[0];

  // Get loading config for the destination, or use default
  const config = loadingConfig[basePath] || {
    title: 'Loading',
    messages: ['Loading page...', 'Preparing content...', 'Almost ready...'],
    icon: <IconInfoCircle className="h-4 w-4 text-white" />,
  };

  return (
    <LoadingScreen
      title={config.title}
      messages={config.messages}
      iconContent={config.icon}
      isLoading={isNavigating}
      position="bottom-right"
    />
  );
}
