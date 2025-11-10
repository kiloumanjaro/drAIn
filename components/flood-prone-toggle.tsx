"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Toggle } from "@/components/ui/toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Layers } from "lucide-react";

interface FloodProneToggleProps {
  floodProneAreas: {
    id: string;
    name: string;
    color: string;
    visible: boolean;
  }[];
  onToggleFloodProneArea: (id: string) => void;
}

export function FloodProneToggle({
  floodProneAreas,
  onToggleFloodProneArea,
}: FloodProneToggleProps) {
  // Check if all flood prone areas are visible
  const allAreasVisible = floodProneAreas.every((area) => area.visible);

  // Toggle all flood prone areas
  const handleToggleAll = (pressed: boolean) => {
    floodProneAreas.forEach((area) => {
      const shouldBeVisible = pressed;
      if (area.visible !== shouldBeVisible) {
        onToggleFloodProneArea(area.id);
      }
    });
  };

  return (
    <Card className="flex gap-2 flex-col pb-4">
      <CardHeader className="flex items-center justify-between pb-0 relative">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Flood Prone Areas</CardTitle>
          <CardDescription className="text-xs">
            Click an area to toggle on or off
          </CardDescription>
        </div>

        <Toggle
          id="toggle-all-flood-prone"
          pressed={allAreasVisible}
          onPressedChange={handleToggleAll}
          variant="outline"
          size="sm"
          aria-label="Toggle all flood prone areas"
          className={`ml-auto border transition-colors cursor-pointer duration-300 ${
            allAreasVisible ? "border-[#3F83DB]" : "border-gray-300"
          }`}
        >
          <Layers
            className={`h-4 w-4 ${
              allAreasVisible ? "text-[#3F83DB]" : "text-gray-400"
            }`}
          />
        </Toggle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {floodProneAreas.map((area) => (
          <div key={area.id}>
            <div
              className={`
                flex items-center space-x-3 py-2 rounded-lg
                transition-all duration-200 ease-in-out group cursor-pointer
              `}
              onClick={() => onToggleFloodProneArea(area.id)}
            >
              <div className="flex items-center gap-2.5 flex-1">
                <div
                  className={`
                    w-3 h-3 rounded-full border-2
                    transition-all duration-200
                    ${
                      area.visible
                        ? "border-white shadow-md scale-110"
                        : "border-gray-300"
                    }
                  `}
                  style={{
                    backgroundColor: area.color,
                    boxShadow: area.visible
                      ? `0 0 8px ${area.color}40`
                      : "none",
                  }}
                />
                <Label
                  htmlFor={area.id}
                  className={`
                    text-sm cursor-pointer transition-all duration-200 font-normal
                    ${
                      area.visible
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }
                    group-hover:text-foreground
                  `}
                >
                  {area.name}
                </Label>
              </div>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFloodProneArea(area.id);
                }}
              >
                <Switch
                  checked={area.visible}
                  onCheckedChange={() => {}}
                  className="ml-auto cursor-pointer"
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
