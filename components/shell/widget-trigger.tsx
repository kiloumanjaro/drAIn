'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

const LATEST_HEADLINE = 'Flash Flood of Nov 14, 2025';

const comparisonEvent = {
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

const DOCS_HREF = `/docs?section=reports&compareEvent=${encodeURIComponent(
  JSON.stringify(comparisonEvent)
)}`;

export default function WidgetTrigger() {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // Keyboard focus opens the headline the same way the mouse does, so the
  // link is never focused while its text is hidden.
  const expanded = hovered || focused;

  return (
    <Link
      href={DOCS_HREF}
      prefetch={false}
      aria-label={`Latest flood event: ${LATEST_HEADLINE}. Read the report`}
      title={!expanded ? LATEST_HEADLINE : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={`flex h-9 items-stretch overflow-hidden transition-all duration-300 ${!expanded ? 'animate-widget-shake' : 'rounded-sm'}`}
      style={{
        maxWidth: expanded ? '300px' : '36px',
      }}
    >
      <span className="flex w-9 shrink-0 items-center justify-center overflow-hidden">
        {/* The source files are several megabytes; a fixed 36px box lets the
            image optimiser serve a thumbnail instead. */}
        <Image
          src={expanded ? '/images/hovered.png' : '/images/unhovered.png'}
          alt=""
          width={36}
          height={36}
          sizes="36px"
          className="h-9 w-9 object-cover transition-all duration-300"
        />
      </span>

      <span
        className="flex items-center self-stretch bg-white px-4 text-xs font-normal text-gray-600 transition-all duration-500 hover:text-gray-800"
        style={{ opacity: expanded ? 1 : 0, minWidth: '210px' }}
      >
        <span className="truncate">{LATEST_HEADLINE}</span>
      </span>
    </Link>
  );
}
