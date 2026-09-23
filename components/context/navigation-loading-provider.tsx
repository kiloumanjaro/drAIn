'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface NavigationLoadingContextType {
  isNavigating: boolean;
  destination: string | null;
  setNavigationState: (
    isNavigating: boolean,
    destination: string | null
  ) => void;
}

const NavigationLoadingContext = createContext<
  NavigationLoadingContextType | undefined
>(undefined);

export function NavigationLoadingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [destination, setDestination] = useState<string | null>(null);

  const setNavigationState = useCallback(
    (navigating: boolean, dest: string | null) => {
      setIsNavigating(navigating);
      setDestination(dest);
    },
    []
  );

  return (
    <NavigationLoadingContext.Provider
      value={{ isNavigating, destination, setNavigationState }}
    >
      {children}
    </NavigationLoadingContext.Provider>
  );
}

export function useNavigationLoading() {
  const context = useContext(NavigationLoadingContext);
  if (context === undefined) {
    throw new Error(
      'useNavigationLoading must be used within a NavigationLoadingProvider'
    );
  }
  return context;
}
