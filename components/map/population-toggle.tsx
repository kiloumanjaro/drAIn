'use client';

import { Toggle } from '@/components/ui/toggle';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Info } from 'lucide-react';
import { useMemo } from 'react';
import { Label } from '@/components/ui/label';

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
      population: '364,116',
      density: '10,442',
      landArea: '34.87',
    };

    return { totalBarangays, cityData };
  }, []);

  return (
    <div className="rounded-xl border border-[#e2e2e2] bg-[#f7f7f7]">
      <div
        className="flex cursor-pointer flex-row items-center justify-between rounded-t-xl px-4 py-2 transition-colors hover:bg-[#e8e8e8]"
        onClick={() => {
          if (onNavigateToDataSource) {
            onNavigateToDataSource();
          }
        }}
      >
        <span className="text-xs">Population Data</span>
        <Info className="h-3.5 w-3.5 opacity-70" />
      </div>

      <Card className="gap-3 border-x-0 border-b-0 pb-6">
        <CardHeader className="relative flex items-center justify-between pb-0">
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
            className={`ml-auto cursor-pointer border transition-colors duration-300 ${
              isVisible ? 'border-[#0288d1]' : 'border-gray-300'
            }`}
          >
            <Info
              className={`h-4 w-4 ${
                isVisible ? 'text-[#0288d1]' : 'text-gray-400'
              }`}
            />
          </Toggle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Mandaue City</Label>
          </div>

          {/* City Statistics */}
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs">Land Area</span>
                <span className="text-sm font-semibold">
                  {populationData.cityData.landArea} km²
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs">
                  Population
                </span>
                <span className="text-sm font-semibold">
                  {populationData.cityData.population}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex flex-col">
                <span className="text-muted-foreground text-xs">
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
