'use client';

import { useEventWidgetStore, NewEventData } from '../stores/eventWidgetStore';

// Placeholder data for a new event
const newEventPlaceholder: NewEventData = {
  eventName: "NEW EVENT: Flash Flood of Nov 14, 2025",
  summary: "A sudden, intense downpour from a localized thunderstorm caused unexpected flooding in Barangay Tipolo.",
  data: {
    "Time": "4:30 PM",
    "Estimated Rainfall": "30mm in 1 hour",
    "Affected Areas": "Brgy. Tipolo, near the San Miguel complex.",
    "Initial Impact": "Moderate traffic disruption, stranded commuters."
  }
};

export default function WidgetTrigger() {
  const openWidget = useEventWidgetStore((state) => state.openWidget);

  return (
    <button
      onClick={() => openWidget(newEventPlaceholder)}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Show Live Event
    </button>
  );
}
