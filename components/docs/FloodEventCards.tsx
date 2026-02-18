'use client';

import { Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import DateBadge from './DateBadge';
import EventTimeline from './EventTimeline';

interface FloodEvent {
  eventName: string;
  summary: string;
  data: Record<string, string>;
}

interface FloodEventCardsProps {
  events: FloodEvent[];
  comparisonEvent?: FloodEvent | null;
}

// Strips "Event N: " or "NEW EVENT: " prefix → e.g. "Flash Flood of July 1, 2016"
function stripPrefix(name: string): string {
  return name.replace(/^(Event\s+\d+|NEW\s+EVENT):\s*/i, '');
}

// Extracts { month: "Jul", day: "1" } from "...of July 1, 2016"
function extractDate(name: string): { month: string; day: string } | null {
  const match = name.match(
    /of\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})/i
  );
  if (!match) return null;
  const monthAbbr: Record<string, string> = {
    january: 'Jan',
    february: 'Feb',
    march: 'Mar',
    april: 'Apr',
    may: 'May',
    june: 'Jun',
    july: 'Jul',
    august: 'Aug',
    september: 'Sep',
    october: 'Oct',
    november: 'Nov',
    december: 'Dec',
  };
  return {
    month: monthAbbr[match[1].toLowerCase()] ?? match[1].slice(0, 3),
    day: match[2],
  };
}

export default function FloodEventCards({
  events,
  comparisonEvent,
}: FloodEventCardsProps) {
  const allEvents = comparisonEvent ? [comparisonEvent, ...events] : events;

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 gap-4">
        {allEvents.map((event, idx) => {
          const isComparison = !!comparisonEvent && idx === 0;
          const displayName = stripPrefix(event.eventName);
          const date = extractDate(event.eventName);

          const allEntries = Object.entries(event.data);

          return (
            <div
              key={idx}
              className={`rounded-xl border ${isComparison ? 'border-blue-400' : 'border-[#dfdfdf]'} bg-[#f7f7f7]`}
            >
              {/* Header bar */}
              <div className="flex cursor-pointer flex-row items-center justify-between rounded-t-xl px-4 py-2 transition-colors">
                <span className="text-xs">{displayName}</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 cursor-help opacity-70" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {isComparison
                        ? 'Latest flood event'
                        : 'Historical flood event'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Body */}
              <Card
                className={`gap-0 border-x-0 border-b-0 ${isComparison ? 'border-blue-200' : 'border-[#dfdfdf]'} px-6 py-4 !pb-0`}
              >
                {/* Summary row: DateBadge + summary text */}
                <div className="mb-4 flex items-start gap-3">
                  {date && <DateBadge month={date.month} day={date.day} />}
                  <p className="text-xs leading-relaxed text-slate-500 italic">
                    {event.summary}
                  </p>
                </div>

                {/* All data fields as timeline */}
                <div className="flex gap-3">
                  <EventTimeline count={allEntries.length} />
                  <div className="flex flex-1 flex-col gap-4">
                    {allEntries.map(([key, value]) => (
                      <div key={key} style={{ minHeight: '50px' }}>
                        <p className="text-xs font-medium text-slate-700">
                          {key}
                        </p>
                        <p className="text-xs text-slate-500">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
