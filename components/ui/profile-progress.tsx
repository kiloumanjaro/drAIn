'use client';

import { useState } from 'react';
import { CheckIcon } from '@/components/check-icon';
import {
  IconCircleCheckFilled,
  IconInfoCircleFilled,
} from '@tabler/icons-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Spinner } from '@/components/ui/spinner';

export interface ProfileStep {
  title: string;
  description?: string;
  completed: boolean;
}

interface ProfileProgressProps {
  current: number;
  total: number;
  percentage?: number;
  steps?: ProfileStep[];
}

export function ProfileProgress({
  current,
  total,
  percentage,
  steps,
}: ProfileProgressProps) {
  const [isOpen, setIsOpen] = useState(false);
  const calculatedPercentage =
    percentage ?? Math.round((current / total) * 100);
  const hasSteps = steps && steps.length > 0;

  const progressBar = (
    <div
      className={`flex h-8.5 flex-1 items-center gap-2 rounded-full border border-[#DCDCDC] px-3 py-1.5 transition-colors ${
        isOpen ? 'bg-[#f7f7f7]' : 'bg-white'
      }`}
    >
      {/* Check icon */}
      <CheckIcon className="h-4.5 w-4.5 text-[#b4b4b6]" />

      {/* Progress text */}
      <span className="text-sm text-[#666666]">
        {current} of {total}
      </span>

      {/* Progress bar */}
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-[#E5E5E5]">
        <div
          className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-[#4ADE80] to-[#22C55E] transition-all duration-300"
          style={{ width: `${calculatedPercentage}%` }}
        />
      </div>

      {/* Percentage text */}
      <span className="text-sm text-[#666666]">{calculatedPercentage}%</span>
    </div>
  );

  if (!hasSteps) {
    return progressBar;
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="relative flex-1"
    >
      <CollapsibleTrigger asChild>
        <div className="cursor-pointer">{progressBar}</div>
      </CollapsibleTrigger>
      <CollapsibleContent className="absolute top-full right-0 left-0 z-50 mt-2">
        <TooltipProvider>
          <div className="space-y-2 rounded-lg border border-[#DCDCDC] bg-white p-3 shadow-lg">
            {steps.map((step, index) => (
              <div
                key={index}
                className="group flex items-start gap-3 rounded-md p-2 transition-colors"
              >
                <div className="mt-0.5">
                  {step.completed ? (
                    <IconCircleCheckFilled className="h-4 w-4 text-[#22C55E]" />
                  ) : (
                    <Spinner className="h-4 w-4 text-[#8D8D8D]" />
                  )}
                </div>
                <div className="flex flex-1 items-center gap-1.5">
                  <p
                    className={`text-sm transition-colors ${
                      step.completed ? 'text-[#22C55E]' : 'text-[#666666]'
                    } group-hover:text-[#8D8D8D]`}
                  >
                    {step.title}
                  </p>
                  {step.description && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <IconInfoCircleFilled className="h-3.5 w-3.5 flex-shrink-0 cursor-help text-[#8D8D8D]/50 opacity-0 transition-opacity group-hover:opacity-100 hover:text-[#8D8D8D]" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">{step.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TooltipProvider>
      </CollapsibleContent>
    </Collapsible>
  );
}
