'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { latestFloodEvent, stripPrefix } from '@/lib/docs/flood-events';
import { useFloodEvents } from '@/lib/query/hooks/use-flood-events';

const DOCS_HREF = '/docs?section=reports';

export default function WidgetTrigger() {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const { data: events, isPending } = useFloodEvents();
  // Keyboard focus opens the headline the same way the mouse does, so the
  // link is never focused while its text is hidden.
  const expanded = hovered || focused;

  // While the events load, hold the widget's place below lg, where the map
  // style button sits right under it: otherwise that button drops by the
  // widget's height when the events arrive, and a tap aimed at it lands on
  // this link. From lg up the button is pinned to the bottom, so no slot.
  if (isPending) {
    return (
      <span
        aria-hidden
        className="pointer-events-none block h-9 w-9 lg:hidden"
      />
    );
  }

  // Nothing to announce when the events fail to load or there are none: the
  // widget is simply absent.
  const latest = events ? latestFloodEvent(events) : null;
  if (!latest) return null;
  const headline = stripPrefix(latest.eventName);

  return (
    <Link
      href={DOCS_HREF}
      prefetch={false}
      aria-label={`Latest flood event: ${headline}. Read the report`}
      // Stays on when expanded: a long headline is cut short there too.
      title={headline}
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
        {/* A fixed 36px box lets the image optimiser serve a thumbnail of the
            256px source. */}
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
        <span className="truncate">{headline}</span>
      </span>
    </Link>
  );
}
