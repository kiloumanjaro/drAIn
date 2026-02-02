'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface EventWidgetContextType {
  isOpen: boolean;
  eventData: any;
  openWidget: (data: any) => void;
  closeWidget: () => void;
}

const EventWidgetContext = createContext<EventWidgetContextType | undefined>(
  undefined
);

export function EventWidgetProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [eventData, setEventData] = useState<any>(null);

  const openWidget = (data: any) => {
    setEventData(data);
    setIsOpen(true);
  };

  const closeWidget = () => {
    setIsOpen(false);
    setEventData(null);
  };

  const value = { isOpen, eventData, openWidget, closeWidget };

  return (
    <EventWidgetContext.Provider value={value}>
      {children}
    </EventWidgetContext.Provider>
  );
}

export function useEventWidget() {
  const context = useContext(EventWidgetContext);
  if (context === undefined) {
    throw new Error(
      'useEventWidget must be used within an EventWidgetProvider'
    );
  }
  return context;
}
