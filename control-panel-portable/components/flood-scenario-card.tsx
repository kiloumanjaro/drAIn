'use client';

import { Toggle } from '@/components/ui/toggle';
import { FloodScenarioSelector } from '@/components/flood-scenario-selector';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TriangleAlert } from 'lucide-react';
import { Spinner } from './ui/spinner';

interface FloodScenarioCardProps {
  isVisible: boolean;
  onToggle: () => void;
  selectedScenario?: string;
  onScenarioChange?: (id: string) => void;
  isLoading?: boolean;
}

export function FloodScenarioCard({
  isVisible,
  onToggle,
  selectedScenario,
  onScenarioChange,
  isLoading,
}: FloodScenarioCardProps) {
  // Auto-toggle flood hazard layer on when a scenario is selected
  const handleScenarioChange = (scenario: string) => {
    // If flood hazard layer is off, turn it on when selecting a scenario
    if (!isVisible) {
      onToggle();
    }
    // Call the scenario change handler
    onScenarioChange?.(scenario);
  };

  return (
    <div className="rounded-xl border border-t-0 border-[#e2e2e2] bg-[#f7f7f7]">
      <Card className="flex flex-col gap-2 border-x-0">
        <CardHeader className="relative flex items-center justify-between pb-0">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Flood Scenarios</CardTitle>
            <CardDescription className="text-xs">
              Select a period to view hazard levels
            </CardDescription>
          </div>

          <Toggle
            id="toggle-flood"
            pressed={isVisible}
            onPressedChange={onToggle}
            variant="outline"
            size="sm"
            aria-label="Toggle flood hazard layer"
            className={`ml-auto cursor-pointer border transition-colors duration-300 ${
              isVisible ? 'border-[#3F83DB]' : 'border-gray-300'
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <Spinner className="h-4 w-4 text-[#3F83DB]" />
            ) : (
              <TriangleAlert
                className={`h-4 w-4 ${
                  isVisible ? 'text-[#3F83DB]' : 'text-gray-400'
                }`}
              />
            )}
          </Toggle>
        </CardHeader>
        <CardContent className="flex-1 pt-3 pb-0">
          <FloodScenarioSelector
            selectedScenario={selectedScenario}
            onScenarioChange={handleScenarioChange}
          />
        </CardContent>
      </Card>
      <div className="flex items-center justify-end gap-3 px-4 py-2">
        <div className="flex flex-row items-center gap-2">
          <div className="h-1.5 w-4 rounded-lg bg-[#d73027]" />
          <span className="text-xs">High</span>
        </div>
        <div className="flex flex-row items-center gap-2">
          <div className="h-1.5 w-4 rounded-lg bg-[#fc8d59]" />
          <span className="text-xs">Medium</span>
        </div>
        <div className="flex flex-row items-center gap-2">
          <div className="h-1.5 w-4 rounded-lg bg-[#fee090]" />
          <span className="text-xs">Low</span>
        </div>
      </div>
    </div>
  );
}
