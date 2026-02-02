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

interface OverlayLegendProps {
  overlays: {
    id: string;
    name: string;
    color: string;
    visible: boolean;
  }[];
  onToggleOverlay: (id: string) => void;
}

export function OverlayLegend({
  overlays,
  onToggleOverlay,
}: OverlayLegendProps) {
  // Filter out drainage components (exclude reports-layer)
  const drainageOverlays = overlays.filter((o) => o.id !== 'reports-layer');

  // Check if all drainage components are visible
  const allDrainageVisible = drainageOverlays.every((o) => o.visible);

  // Toggle all drainage layers
  const handleToggleAll = (pressed: boolean) => {
    let firstToggled = false;
    drainageOverlays.forEach((overlay) => {
      // If toggle is pressed (on), show all layers
      // If toggle is not pressed (off), hide all layers
      const shouldBeVisible = pressed;
      if (overlay.visible !== shouldBeVisible) {
        onToggleOverlay(overlay.id);
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
          <CardTitle>Map Layers</CardTitle>
          <CardDescription className="text-xs">
            Click an item to toggle on or off
          </CardDescription>
        </div>

        <Toggle
          id="toggle-all"
          pressed={allDrainageVisible}
          onPressedChange={handleToggleAll}
          variant="outline"
          size="sm"
          aria-label="Toggle all layers"
          className={`ml-auto cursor-pointer border transition-colors duration-300 ${
            allDrainageVisible ? 'border-[#3F83DB]' : 'border-gray-300'
          }`}
        >
          <Layers
            className={`h-4 w-4 ${
              allDrainageVisible ? 'text-[#3F83DB]' : 'text-gray-400'
            }`}
          />
        </Toggle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        {overlays.map((overlay, _index) => (
          <div key={overlay.id}>
            <div
              className={`group flex cursor-pointer items-center space-x-3 rounded-lg py-2 transition-all duration-200 ease-in-out`}
              onClick={() => onToggleOverlay(overlay.id)}
            >
              <div className="flex flex-1 items-center gap-2.5">
                <div
                  className={`h-3 w-3 rounded-full border-2 transition-all duration-200 ${
                    overlay.visible
                      ? 'scale-110 border-white shadow-md'
                      : 'border-gray-300'
                  } `}
                  style={{
                    backgroundColor: overlay.color,
                    boxShadow: overlay.visible
                      ? `0 0 8px ${overlay.color}40`
                      : 'none',
                  }}
                />
                <Label
                  htmlFor={overlay.id}
                  className={`cursor-pointer text-sm font-normal transition-all duration-200 ${
                    overlay.visible
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  } group-hover:text-foreground`}
                >
                  {overlay.name}
                </Label>
              </div>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleOverlay(overlay.id);
                }}
              >
                <Switch
                  checked={overlay.visible}
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
