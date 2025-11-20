"use client";

import { Toggle } from "@/components/ui/toggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Info } from "lucide-react";
import { useMemo } from "react";
import { Label } from "@/components/ui/label";

interface PopulationToggleProps {
  isVisible: boolean;
  onToggle: () => void;
  onNavigateToDataSource?: () => void;
}

export function PopulationToggle({
  isVisible,
  onToggle,
  onNavigateToDataSource,
}: PopulationToggleProps) {

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
      <div
        className="py-2 px-4 flex flex-row items-center justify-between cursor-pointer hover:bg-[#e8e8e8] transition-colors rounded-t-xl"
        onClick={() => {
          if (onNavigateToDataSource) {
            onNavigateToDataSource();
          }
        }}
      >
        <span className="text-xs">Population Data</span>
        <Info className="h-3.5 w-3.5 opacity-70" />
      </div>

      <Card className="border-x-0 border-b-0 gap-3 pb-6">
        <CardHeader className="flex items-center justify-between pb-0 relative">
          <div className="flex flex-col gap-1.5">
            <CardTitle className="flex flex-row">
              <span>{populationData.totalBarangays} barangays</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Hover to see population boundaries
            </CardDescription>
          </div>

          <Toggle
            id="population-toggle"
            pressed={isVisible}
            onPressedChange={onToggle}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            variant="outline"
            size="sm"
            aria-label="Toggle population visibility"
            className={`ml-auto border transition-colors cursor-pointer duration-300 ${
              isVisible ? "border-[#0288d1]" : "border-gray-300"
            }`}
          >
            <Info
              className={`h-4 w-4 ${
                isVisible ? "text-[#0288d1]" : "text-gray-400"
              }`}
            />
          </Toggle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Mandaue City</Label>
          </div>

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
                <span className="text-xs text-muted-foreground">
                  Population
                </span>
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
    </div>
  );
}
