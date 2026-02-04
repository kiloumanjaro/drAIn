'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface EventData {
  eventName: string;
  summary: string;
  data: Record<string, unknown>;
}

interface EventWidgetContextType {
  isOpen: boolean;
  eventData: EventData | null;
  openWidget: (data: EventData) => void;
  closeWidget: () => void;
}

const EventWidgetContext = createContext<EventWidgetContextType | undefined>(
  undefined
);

export function EventWidgetProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [eventData, setEventData] = useState<EventData | null>(null);

  const openWidget = (data: EventData) => {
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
