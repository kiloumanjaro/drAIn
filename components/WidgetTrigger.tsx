'use client';

import { useEventWidget } from './context/EventWidgetProvider';

// Placeholder data for a new event
const newEventPlaceholder = {
  eventName: 'NEW EVENT: Flash Flood of Nov 14, 2025',
  summary:
    'A sudden, intense downpour from a localized thunderstorm caused unexpected flooding in Barangay Tipolo.',
  data: {
    Time: '4:30 PM',
    'Estimated Rainfall': '30mm in 1 hour',
    'Affected Areas': 'Brgy. Tipolo, near the San Miguel complex.',
    'Initial Impact': 'Moderate traffic disruption, stranded commuters.',
  },
};

export default function WidgetTrigger() {
  const { openWidget, closeWidget, isOpen } = useEventWidget();

  return (
    <button
      onClick={() => (isOpen ? closeWidget() : openWidget(newEventPlaceholder))}
      className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
    >
      {isOpen ? 'Hide Live Event' : 'Show Live Event'}
    </button>
  );
}
