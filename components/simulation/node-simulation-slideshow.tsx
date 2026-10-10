'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { NodeMetricComparisonChart } from '@/components/simulation/node-metric-comparison-chart';
import type { NodeDetails } from '@/types/simulation';

type YearOption = 2 | 5 | 10 | 15 | 20 | 25 | 50 | 100;

interface NodeSimulationSlideshowProps {
  nodeId: string;
  onClose: () => void;
  /** The return period, for stored scenarios. A custom storm has none. */
  selectedYear?: YearOption;
  nodeData: NodeDetails;
  allNodesData: NodeDetails[];
}

interface MetricSlide {
  id: string;
  title: string;
  value: (details: NodeDetails) => string;
  unit: string;
  description: string;
}

const METRIC_SLIDES: MetricSlide[] = [
  {
    id: 'time_before_overflow',
    title: 'Time Before Overflow',
    // Null means the node never overflowed. It used to read "9999.00 min".
    value: (details) =>
      details.Time_Before_Overflow === null
        ? '—'
        : details.Time_Before_Overflow.toFixed(2),
    unit: 'min',
    description: 'Time elapsed before flooding occurs',
  },
  {
    id: 'hours_flooded',
    title: 'Hours Flooded',
    value: (details) => details.Hours_Flooded.toFixed(2),
    unit: 'hrs',
    description: 'Total duration of flooding at this location',
  },
  {
    id: 'maximum_rate',
    title: 'Maximum Rate',
    value: (details) => details.Maximum_Rate.toFixed(3),
    unit: 'CMS',
    description: 'Peak flow rate during the simulation period',
  },
  {
    id: 'time_of_max',
    title: 'Time of Max',
    value: (details) => details.Time_Of_Max_Occurence.toFixed(2),
    unit: 'min',
    description: 'Time when maximum flow rate occurs',
  },
  {
    id: 'total_flood_volume',
    title: 'Total Flood Volume',
    value: (details) => details.Total_Flood_Volume.toFixed(3),
    unit: '× 10⁶ L',
    description: 'Cumulative volume of water overflow',
  },
];

export function NodeSimulationSlideshow({
  nodeId,
  onClose,
  selectedYear,
  nodeData,
  allNodesData,
}: NodeSimulationSlideshowProps) {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  // What had the keyboard when the slideshow opened.
  const openerRef = useRef<HTMLElement | null>(null);

  /**
   * Where the keyboard goes when the slideshow closes: back to whatever had
   * it, if that is still on the page. Usually it is not: opening from a
   * results table puts the table away, and it comes back as new elements. So
   * failing that, the row's own button in the table that has come back.
   */
  const returnFocus = (event: Event) => {
    const opener = openerRef.current;
    openerRef.current = null;

    const rowButtonLabel = `Open ${nodeId} simulation`;
    const target = opener?.isConnected
      ? opener
      : Array.from(
          document.querySelectorAll<HTMLElement>('button[aria-label]')
        ).find(
          (button) => button.getAttribute('aria-label') === rowButtonLabel
        );
    if (!target) return;

    event.preventDefault();
    target.focus();
  };

  // Arrow keys change the slide. Escape and the focus trap come from the
  // dialog; the return of focus is above.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && activeSlideIndex > 0) {
        setActiveSlideIndex(activeSlideIndex - 1);
      } else if (
        e.key === 'ArrowRight' &&
        activeSlideIndex < METRIC_SLIDES.length - 1
      ) {
        setActiveSlideIndex(activeSlideIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSlideIndex]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {/* On the right of the screen, 25px above centre, as it always was;
          placed with CSS so nothing reads the window size while rendering.
          On a screen too short for that (a phone on its side) it starts at
          the top instead, is no taller than the screen, and scrolls. That
          still fits a tablet with the navigation rail, so unlike the tables
          it changes at phone width, not with the compact map: there it
          spans the screen under the navigation button, and its 450px gives
          way on a screen too short for it.
          The layer sits above the parameter panels (1000), which would
          otherwise cover a dialog that has taken the keyboard. */}
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        onOpenAutoFocus={() => {
          const focused = document.activeElement;
          openerRef.current =
            focused instanceof HTMLElement && focused !== document.body
              ? focused
              : null;
        }}
        onCloseAutoFocus={returnFocus}
        overlayClassName="z-[1100] bg-black/20"
        className="top-[max(0.5rem,calc(50%-250px))] right-[100px] left-auto z-[1101] flex h-[450px] w-[550px] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-y-auto border-[#ced1cd] bg-[#f7f7f7] p-0 shadow-2xl max-md:inset-x-2 max-md:top-16 max-md:h-auto max-md:max-h-[calc(100dvh-5rem)] max-md:min-h-[min(450px,calc(100dvh-5rem))] max-md:w-auto sm:max-w-none md:max-h-[calc(100dvh-1rem)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-lg bg-[#f7f7f7] p-2 pl-5">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-sm leading-5 font-semibold text-gray-600">
              {nodeId} Simulation
            </DialogTitle>
          </div>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close"
              className="h-8 w-8"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </Button>
          </DialogClose>
        </div>

        {/* Main content */}
        <div className="relative flex flex-1 flex-col items-center justify-center rounded-lg border-y border-[#ced1cd] bg-white">
          {/* Slideshow content */}
          <div className="flex h-full w-full flex-col">
            {/* Slide content */}
            <div className="flex flex-1 flex-col space-y-4 px-8 py-6">
              <div className="flex flex-row justify-between" aria-live="polite">
                <div className="">
                  <h2 className="text-2xl font-bold">
                    {METRIC_SLIDES[activeSlideIndex].title}
                  </h2>

                  <p className="text-muted-foreground max-w-60 text-xs">
                    {METRIC_SLIDES[activeSlideIndex].description}
                  </p>
                </div>
                <div className="text-primary text-5xl font-bold">
                  {METRIC_SLIDES[activeSlideIndex].value(nodeData)}
                  <span className="ml-2 text-xl">
                    {METRIC_SLIDES[activeSlideIndex].unit}
                  </span>
                </div>
              </div>

              {/* Show comparison chart for each metric */}
              <div className="w-full max-w-lg">
                {METRIC_SLIDES[activeSlideIndex].id ===
                  'time_before_overflow' && (
                  <NodeMetricComparisonChart
                    nodeId={nodeId}
                    year={selectedYear}
                    metricKey="Time_Before_Overflow"
                    metricLabel="Time Before Overflow (min)"
                    maxNodes={50}
                    allNodesData={allNodesData}
                  />
                )}
                {METRIC_SLIDES[activeSlideIndex].id === 'hours_flooded' && (
                  <NodeMetricComparisonChart
                    nodeId={nodeId}
                    year={selectedYear}
                    metricKey="Hours_Flooded"
                    metricLabel="Hours Flooded (hrs)"
                    maxNodes={50}
                    allNodesData={allNodesData}
                  />
                )}
                {METRIC_SLIDES[activeSlideIndex].id === 'maximum_rate' && (
                  <NodeMetricComparisonChart
                    nodeId={nodeId}
                    year={selectedYear}
                    metricKey="Maximum_Rate"
                    metricLabel="Maximum Rate (CMS)"
                    maxNodes={50}
                    allNodesData={allNodesData}
                  />
                )}
                {METRIC_SLIDES[activeSlideIndex].id === 'time_of_max' && (
                  <NodeMetricComparisonChart
                    nodeId={nodeId}
                    year={selectedYear}
                    metricKey="Time_Of_Max_Occurence"
                    metricLabel="Time of Max (hr)"
                    maxNodes={50}
                    allNodesData={allNodesData}
                  />
                )}
                {METRIC_SLIDES[activeSlideIndex].id ===
                  'total_flood_volume' && (
                  <NodeMetricComparisonChart
                    nodeId={nodeId}
                    year={selectedYear}
                    metricKey="Total_Flood_Volume"
                    metricLabel="Total Flood Volume (× 10⁶ L)"
                    maxNodes={50}
                    allNodesData={allNodesData}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Footer*/}
        <div className="flex h-10 w-full items-center justify-between rounded-b-lg px-5">
          <span className="text-muted-foreground mb-0.5 text-xs">
            Use arrow keys or click page navigation
          </span>
          <div className="flex gap-2">
            {METRIC_SLIDES.map((slide, index) => (
              <button
                key={index}
                onClick={() => setActiveSlideIndex(index)}
                className={cn(
                  'h-2 rounded-full transition-all',
                  index === activeSlideIndex
                    ? 'w-8 bg-[#3f83db]'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2'
                )}
                aria-label={`Slide ${index + 1} of ${METRIC_SLIDES.length}: ${slide.title}`}
                aria-current={index === activeSlideIndex ? 'true' : undefined}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
