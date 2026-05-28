'use client';

import { useRouter } from 'next/navigation';
import {
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/solid';
import Image from 'next/image';
import { useState, useEffect, useCallback, useRef } from 'react';

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

export default function WidgetTrigger() {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [showHeadline, setShowHeadline] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleNextSwitch = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setShowHeadline((prev) => !prev);
      scheduleNextSwitch();
    }, 5000);
  }, []);

  useEffect(() => {
    scheduleNextSwitch();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [scheduleNextSwitch]);

  const handleHeadlineClick = () => {
    const compareEventParam = encodeURIComponent(
      JSON.stringify(comparisonEvent)
    );
    router.push(`/docs?section=reports&compareEvent=${compareEventParam}`);
  };

  const handleRefreshClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowHeadline((prev) => !prev);
    scheduleNextSwitch();
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`flex h-9 items-stretch overflow-hidden transition-all duration-300 ${!hovered ? 'animate-widget-shake' : 'rounded-sm'}`}
      style={{
        maxWidth: hovered ? '300px' : '36px',
      }}
      title={!hovered ? LATEST_HEADLINE : undefined}
    >
      {/* Icon square — always visible */}
      <button className="flex w-9 shrink-0 items-center justify-center overflow-hidden">
        <Image
          src={hovered ? '/images/hovered.png' : '/images/unhovered.png'}
          alt="Alert"
          width={36}
          height={36}
          className="h-9 w-9 object-cover transition-all duration-300"
          priority
        />
      </button>

      {/* White headline bar — always rendered but hidden/shown via max-width */}
      <button
        onClick={handleHeadlineClick}
        className="flex items-center justify-between self-stretch bg-white px-4 text-xs font-normal text-gray-600 transition-all duration-500 hover:text-gray-800"
        style={{ opacity: hovered ? 1 : 0, minWidth: '210px' }}
      >
        <span
          key={showHeadline ? 'headline' : 'weather'}
          className="animate-fade truncate"
        >
          {showHeadline ? LATEST_HEADLINE : 'The chances of rain are 50%'}
        </span>
        <div
          onClick={handleRefreshClick}
          className="ml-2 shrink-0 cursor-pointer transition-opacity hover:opacity-70"
        >
          <ArrowPathIcon className="h-3.5 w-3.5" />
        </div>
      </button>
    </div>
  );
}
