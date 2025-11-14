# Event Widget Feature Guide

This document provides a guide on how to use and integrate the new draggable event widget feature.

## Overview

The event widget is a draggable pop-up card that can display data for a new, incoming flood event. It is accessible from anywhere in the application and serves two primary functions:

1.  **Provide a quick, at-a-glance view of a new event's data.**
2.  **Act as a gateway to the main `/reports` page, passing the new event's data to be displayed alongside the historical records for direct comparison.**

## How to Use

To open the event widget, you can use the `useEventWidgetStore` hook. This hook provides an `openWidget` function that you can call with the new event's data.

```tsx
import { useEventWidgetStore, NewEventData } from '@/stores/eventWidgetStore';

const MyComponent = () => {
  const openWidget = useEventWidgetStore((state) => state.openWidget);

  const handleOpenWidget = () => {
    const newEvent: NewEventData = {
      eventName: "NEW EVENT: Flash Flood of Nov 14, 2025",
      summary: "A sudden, intense downpour from a localized thunderstorm caused unexpected flooding in Barangay Tipolo.",
      data: {
        "Time": "4:30 PM",
        "Estimated Rainfall": "30mm in 1 hour",
        "Affected Areas": "Brgy. Tipolo, near the San Miguel complex.",
        "Initial Impact": "Moderate traffic disruption, stranded commuters."
      }
    };
    openWidget(newEvent);
  };

  return <button onClick={handleOpenWidget}>Show Live Event</button>;
};
```

## The "Show Live Event" Button

The "Show Live Event" button that is currently in the sidebar is a placeholder for demonstration purposes. It can be easily disabled or removed.

To disable or remove the button, simply comment out or delete the `<WidgetTrigger />` component from the `app/layout.tsx` file:

```tsx
// ...
import WidgetTrigger from "@/components/WidgetTrigger";
// ...

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // ...
            <SidebarLayout>
              {/* <WidgetTrigger /> */}
              {children}
            </SidebarLayout>
    // ...
  );
}
```

## Integration

The event widget is designed to be easily integrated with other parts of the application. You can trigger it from any component by using the `useEventWidgetStore` hook as described above. This allows you to open the widget in response to any event, such as a new notification or a user action.
