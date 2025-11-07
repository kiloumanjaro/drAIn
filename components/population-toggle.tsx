"use client";

import { Toggle } from "@/components/ui/toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Home, Power } from "lucide-react";
import { useState, useMemo } from "react";

interface PopulationToggleProps {
  isVisible: boolean;
  onToggle: () => void;
}

export function PopulationToggle({
  isVisible,
  onToggle,
}: PopulationToggleProps) {
  const [visible, setVisible] = useState(isVisible);

  // Parse the GeoJSON data to get barangay count and city stats
  const populationData = useMemo(() => {
    // Total features minus 1 (excluding Mandaue City overall)
    const totalBarangays = 27; // Based on the GeoJSON structure
    
    // Mandaue City overall statistics
    const cityData = {
      population: "364,116",
      density: "10,442",
      landArea: "34.87",
    };

    return { totalBarangays, cityData };
  }, []);

  return (
    <div className="bg-[#f7f7f7] rounded-xl border border-[#e2e2e2]">
      <div className="py-2 px-4 flex flex-row items-center justify-between">
        <span className="text-xs">Population Data</span>
      </div>

      <Card className="border-x-0 gap-3 pb-4">
        <CardHeader className="flex-col gap-3 pb-0">
          <CardTitle className="flex flex-row">
            <div className="flex flex-row items-center gap-2">
              <Home className="w-4 h-4" />
              <span>{populationData.totalBarangays} barangays</span>
            </div>

            <Toggle
              id="population-toggle"
              pressed={isVisible}
              onPressedChange={() => {
                onToggle();
                setVisible(!visible);
              }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              variant="outline"
              size="sm"
              aria-label="Toggle population visibility"
              className={`ml-auto border transition-colors cursor-pointer duration-300 ${
                visible ? "border-[#0288d1]" : "border-gray-300"
              }`}
            >
              <Power
                className={`h-4 w-4 ${
                  visible ? "text-[#0288d1]" : "text-gray-400"
                }`}
              />
            </Toggle>
          </CardTitle>
          <CardDescription className="text-xs">
            Toggle visibility of Mandaue City population boundaries
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {/* City Statistics */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Land Area</span>
                <span className="text-sm font-semibold">
                  {populationData.cityData.landArea} km²
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Population</span>
                <span className="text-sm font-semibold">
                  {populationData.cityData.population}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">
                  Population Density
                </span>
                <span className="text-sm font-semibold">
                  {populationData.cityData.density} per km²
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end py-2 px-4 items-center gap-2">
        <div className="bg-[#0288d1] w-4 h-1.5 rounded-lg" />
        <span className="text-xs">Population</span>
      </div>
    </div>
  );
}
