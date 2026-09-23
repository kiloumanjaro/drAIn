'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FloodScenarioSelectorProps {
  selectedScenario?: string;
  onScenarioChange?: (scenario: string) => void;
}

export function FloodScenarioSelector({
  selectedScenario,
  onScenarioChange,
}: FloodScenarioSelectorProps) {
  const scenarios = [
    { id: '5YR', label: '5-Year Return Period', probability: '20%' },
    { id: '15YR', label: '15-Year Return Period', probability: '10%' },
    { id: '25YR', label: '25-Year Return Period', probability: '4%' },
    { id: '50YR', label: '50-Year Return Period', probability: '2%' },
    { id: '100YR', label: '100-Year Return Period', probability: '1%' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Return Period</Label>
      </div>

      <Select value={selectedScenario} onValueChange={onScenarioChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a scenario" />
        </SelectTrigger>
        <SelectContent>
          {scenarios.map((scenario) => (
            <Tooltip key={scenario.id}>
              <TooltipTrigger asChild>
                <SelectItem value={scenario.id}>{scenario.label}</SelectItem>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{scenario.probability} annual chance</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
