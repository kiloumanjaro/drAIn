'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NodeMetricComparisonChart } from '@/components/node-metric-comparison-chart';

type YearOption = 2 | 5 | 10 | 15 | 20 | 25 | 50 | 100;

interface NodeDetails {
  Node_ID: string;
  Vulnerability_Category: string;
  Vulnerability_Rank: number;
  Cluster: number;
  Cluster_Score: number;
  YR: number;
  Time_Before_Overflow: number;
  Hours_Flooded: number;
  Maximum_Rate: number;
  Time_Of_Max_Occurence: number;
  Total_Flood_Volume: number;
}

interface NodeSimulationSlideshowProps {
  nodeId: string;
  onClose: () => void;
  selectedYear: YearOption;
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
    value: (details) => details.Time_Before_Overflow.toFixed(2),
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else {
        if (e.key === 'ArrowLeft' && activeSlideIndex > 0) {
          setActiveSlideIndex(activeSlideIndex - 1);
        } else if (
          e.key === 'ArrowRight' &&
          activeSlideIndex < METRIC_SLIDES.length - 1
        ) {
          setActiveSlideIndex(activeSlideIndex + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, activeSlideIndex]);

  // Calculate fixed position - always display on the right side, vertically centered
  const getFixedPosition = () => {
    const dialogWidth = 550;
    const dialogHeight = 500;
    const padding = 100;

    // Fixed position: right side of screen with padding, vertically centered
    const x = window.innerWidth - dialogWidth - padding;
    const y = (window.innerHeight - dialogHeight) / 2;

    return { x, y };
  };

  const { x, y } = getFixedPosition();

  return (
    <>
      {/* Overlay backdrop */}
      <div className="fixed inset-0 z-[100] bg-black/20" onClick={onClose} />

      {/* Dialog */}
      <div
        className="fixed z-[101] flex flex-col rounded-lg border border-[#ced1cd] bg-[#f7f7f7] shadow-2xl"
        style={{
          left: `${x}px`,
          top: `${y}px`,
          width: '550px',
          height: '450px',
        }}
      >
        {/* Header */}
        <div className="items-ccenter flex justify-between rounded-t-lg bg-[#f7f7f7] p-2 pl-5">
          <div className="flex items-center gap-2">
            <h3 className="text-muted-foreground text-sm font-semibold">
              {nodeId} Simulation
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Main content */}
        <div className="relative flex flex-1 flex-col items-center justify-center rounded-lg border-y border-[#ced1cd] bg-white">
          {/* Slideshow content */}
          <div className="flex h-full w-full flex-col">
            {/* Slide content */}
            <div className="flex flex-1 flex-col space-y-4 px-8 py-6">
              <div className="flex flex-row justify-between">
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
            {METRIC_SLIDES.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveSlideIndex(index)}
                className={cn(
                  'h-2 rounded-full transition-all',
                  index === activeSlideIndex
                    ? 'w-8 bg-[#3f83db]'
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50 w-2'
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
