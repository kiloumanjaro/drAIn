'use client';

import { LucideIcon, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FeatureCard {
  icon: LucideIcon;
  title: string;
  description: string;
  tooltip?: string;
}

interface FeatureCardsProps {
  features: FeatureCard[];
  columns?: number;
}

export default function FeatureCards({
  features,
  columns = 3,
}: FeatureCardsProps) {
  const gridCols =
    {
      2: 'md:grid-cols-2',
      3: 'md:grid-cols-3',
      4: 'md:grid-cols-4',
    }[columns] || 'md:grid-cols-3';

  return (
    <TooltipProvider>
      <div className={`mb-6 grid grid-cols-1 gap-4 ${gridCols}`}>
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="rounded-xl border border-[#dfdfdf] bg-[#f7f7f7]"
            >
              <div className="flex cursor-pointer flex-row items-center justify-between rounded-t-xl px-4 py-2 transition-colors">
                <span className="text-xs">{feature.title}</span>
                {feature.tooltip && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 cursor-help opacity-70" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{feature.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              <Card className="gap-3 border-x-0 border-b-0 border-[#dfdfdf] px-6 py-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-slate-100">
                    <Icon className="h-6 w-6 text-slate-600" />
                  </div>
                  <p className="text-sm text-slate-600">
                    {feature.description}
                  </p>
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
