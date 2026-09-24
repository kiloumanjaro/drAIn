'use client';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Toggle } from '@/components/ui/toggle';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Layers } from 'lucide-react';

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
    let firstToggled = false;
    floodProneAreas.forEach((area) => {
      const shouldBeVisible = pressed;
      if (area.visible !== shouldBeVisible) {
        onToggleFloodProneArea(area.id);
        // Only show toast for the first toggle to avoid spam
        if (!firstToggled && pressed) {
          firstToggled = true;
        }
      }
    });
  };

  return (
    <Card className="flex flex-col gap-2 pb-4">
      <CardHeader className="relative flex items-center justify-between pb-0">
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
          className={`ml-auto cursor-pointer border transition-colors duration-300 ${
            allAreasVisible ? 'border-[#3F83DB]' : 'border-gray-300'
          }`}
        >
          <Layers
            className={`h-4 w-4 ${
              allAreasVisible ? 'text-[#3F83DB]' : 'text-gray-400'
            }`}
          />
        </Toggle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {floodProneAreas.map((area) => (
          <div key={area.id}>
            <div
              className={`group flex cursor-pointer items-center space-x-3 rounded-lg py-2 transition-all duration-200 ease-in-out`}
              onClick={() => onToggleFloodProneArea(area.id)}
            >
              <div className="flex flex-1 items-center gap-2.5">
                <div
                  className="h-3 w-3 rounded-full border-2 border-white shadow-2xl transition-all duration-200"
                  style={{
                    backgroundColor: area.color,
                    boxShadow: area.visible
                      ? `0 0 8px ${area.color}40`
                      : 'none',
                  }}
                />
                <Label
                  htmlFor={area.id}
                  className={`cursor-pointer text-sm font-normal transition-all duration-200 ${
                    area.visible ? 'text-foreground' : 'text-muted-foreground'
                  } group-hover:text-foreground`}
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
