"use client";

import { Toggle } from "@/components/ui/toggle";
import { FloodScenarioSelector } from "@/components/flood-scenario-selector";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Spinner } from "./ui/spinner";

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
  const [visible, setVisible] = useState(isVisible);
  return (
    <div className="bg-[#f7f7f7] rounded-xl border border-t-0 border-[#e2e2e2]">
      <Card className="border-x-0 flex gap-2 flex-col">
        <CardHeader className="flex items-center justify-between pb-0 relative">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Flood Scenarios</CardTitle>
            <CardDescription className="text-xs">
              Select a period to view hazard levels
            </CardDescription>
          </div>

          <Toggle
            id="toggle-flood"
            pressed={isVisible}
            onPressedChange={() => {
                onToggle();
                setVisible(!visible);
              }}
            variant="outline"
            size="sm"
            aria-label="Toggle flood hazard layer"
            className={`ml-auto border cursor-pointer transition-colors duration-300 ${
              visible ? "border-[#3F83DB]" : "border-gray-300"
            }`}
            disabled={isLoading}
          >
            {isLoading ? <Spinner className="h-4 w-4" /> : <TriangleAlert
              className={`h-4 w-4 ${
                visible ? "text-[#3F83DB]" : "text-gray-400"
              }`}
            />}
          </Toggle>
        </CardHeader>
        <CardContent className="flex-1 pb-0 pt-3">
          <FloodScenarioSelector
            selectedScenario={selectedScenario}
            onScenarioChange={onScenarioChange}
          />
        </CardContent>
      </Card>
      <div className="flex justify-end py-2 px-4 items-center gap-3">
        <div className="flex flex-row items-center gap-2">
          <div className="bg-[#d73027] w-4 h-1.5 rounded-lg" />
          <span className="text-xs">High</span>
        </div>
        <div className="flex flex-row items-center gap-2">
          <div className="bg-[#fc8d59] w-4 h-1.5 rounded-lg" />
          <span className="text-xs">Medium</span>
        </div>
        <div className="flex flex-row items-center gap-2">
          <div className="bg-[#fee090] w-4 h-1.5 rounded-lg" />
          <span className="text-xs">Low</span>
        </div>
      </div>
    </div>
  );
}
