'use client';

import React from 'react';
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { IconInfoCircleFilled } from '@tabler/icons-react';
import { Loader2, Minimize2, Maximize2, CloudRain, Flame } from 'lucide-react';
import { LoadingScreen } from '@/components/loading-screen';
import type { Inlet, Outlet, Pipe, Drain } from '../../types';
import { useState } from 'react';

interface Model2Props {
  selectedPointId?: string | null;
  selectedInlet?: Inlet | null;
  selectedOutlet?: Outlet | null;
  selectedPipe?: Pipe | null;
  selectedDrain?: Drain | null;
  selectedYear: number | null;
  onYearChange: (year: number | null) => void;
  onGenerateTable: () => void;
  isLoading: boolean;
  onCloseTable?: () => void;
  hasTable?: boolean;
  isTableMinimized?: boolean;
  onToggleMinimize?: () => void;
  isRainActive?: boolean;
  onToggleRain?: (enabled: boolean) => void;
  isFloodPropagationActive?: boolean;
  onToggleFloodPropagation?: (enabled: boolean) => void;
}

type YearOption = 2 | 5 | 10 | 15 | 20 | 25 | 50 | 100;

const YEAR_OPTIONS: YearOption[] = [2, 5, 10, 15, 20, 25, 50, 100];

export default function Model2({
  selectedPointId: _selectedPointId = null,
  selectedInlet: _selectedInlet = null,
  selectedOutlet: _selectedOutlet = null,
  selectedPipe: _selectedPipe = null,
  selectedDrain: _selectedDrain = null,
  selectedYear,
  onYearChange,
  onGenerateTable,
  isLoading,
  onCloseTable: _onCloseTable,
  hasTable = false,
  isTableMinimized = false,
  onToggleMinimize,
  isRainActive = false,
  onToggleRain,
  isFloodPropagationActive = false,
  onToggleFloodPropagation,
}: Model2Props) {
  const [isTogglingTable, setIsTogglingTable] = useState(false);

  const handleToggleTable = async () => {
    if (!onToggleMinimize) return;

    setIsTogglingTable(true);

    try {
      await Promise.resolve(onToggleMinimize()); // works for sync or async
    } finally {
      setTimeout(() => setIsTogglingTable(false), 250); // smooth UX
    }
  };

  return (
    <>
      {/* Loading Screen */}
      <LoadingScreen
        title="Analyzing Hydraulic Capacity"
        messages={[
          'Fetching vulnerability data...',
          'Analyzing drainage system...',
          'Calculating flow rates...',
          'Preparing results table...',
        ]}
        isLoading={isLoading}
        position="bottom-right"
      />

      {/* expand to full available height and allow inner flex children to size correctly */}
      <div className="flex h-full min-h-0 flex-1 flex-col pt-3 pr-4 pb-5 pl-5">
        <CardHeader className="mb-6 px-1 py-0">
          <CardTitle>Hydraulic Capacity Model</CardTitle>
          <CardDescription className="text-xs">
            Analyze drainage system capacity and flow rates under various storm
            return periods
          </CardDescription>
        </CardHeader>

        {/* main content grows */}
        <div className="flex-1 space-y-4">
          {/* Year Selector (row with tooltip) */}
          <div className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">Return Period</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconInfoCircleFilled className="h-3.5 w-3.5 cursor-help text-[#8D8D8D]/50 hover:text-[#8D8D8D]" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      Choose a storm return period to generate vulnerability
                      results for that event frequency.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <Select
              value={selectedYear?.toString() || ''}
              onValueChange={(value) =>
                onYearChange(Number(value) as YearOption)
              }
            >
              <SelectTrigger id="year-select" className="min-w-[120px]">
                <SelectValue placeholder="Choose" />
              </SelectTrigger>
              <SelectContent>
                {YEAR_OPTIONS.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year} Year Storm
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vulnerability Indicator Legend */}
          <div className="space-y-3 px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">Vulnerability Indicator</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconInfoCircleFilled className="h-3.5 w-3.5 cursor-help text-[#8D8D8D]/50 hover:text-[#8D8D8D]" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      Color-coded risk levels based on vulnerability analysis
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className="justify-start gap-1.5 border-[#D32F2F]/20 bg-[#D32F2F]/5 px-2 py-1 hover:bg-[#D32F2F]/10"
              >
                <div className="h-2 w-2 rounded-full bg-[#D32F2F] shadow-sm" />
                <span className="text-foreground text-[10px] font-normal">
                  High
                </span>
              </Badge>

              <Badge
                variant="outline"
                className="justify-start gap-1.5 border-[#FFA000]/20 bg-[#FFA000]/5 px-2 py-1 hover:bg-[#FFA000]/10"
              >
                <div className="h-2 w-2 rounded-full bg-[#FFA000] shadow-sm" />
                <span className="text-foreground text-[10px] font-normal">
                  Medium
                </span>
              </Badge>

              <Badge
                variant="outline"
                className="justify-start gap-1.5 border-[#FDD835]/20 bg-[#FDD835]/5 px-2 py-1 hover:bg-[#FDD835]/10"
              >
                <div className="h-2 w-2 rounded-full bg-[#FDD835] shadow-sm" />
                <span className="text-foreground text-[10px] font-normal">
                  Low
                </span>
              </Badge>

              <Badge
                variant="outline"
                className="justify-start gap-1.5 border-[#388E3C]/20 bg-[#388E3C]/5 px-2 py-1 hover:bg-[#388E3C]/10"
              >
                <div className="h-2 w-2 rounded-full bg-[#388E3C] shadow-sm" />
                <span className="text-foreground text-[10px] font-normal">
                  No Risk
                </span>
              </Badge>
            </div>
          </div>

          {/* Rain Effect Toggle */}
          {onToggleRain && (
            <div
              className={`border-border/40 bg-muted/20 flex items-center justify-between rounded-lg border px-3 py-2 ${!hasTable ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-2">
                <CloudRain className="text-muted-foreground h-4 w-4" />
                <Label
                  htmlFor="rain-toggle"
                  className={`text-sm font-normal ${hasTable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  Rain Effect
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <IconInfoCircleFilled className="h-3.5 w-3.5 cursor-help text-[#8D8D8D]/50 hover:text-[#8D8D8D]" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        {hasTable
                          ? 'Toggle rainfall visualization effect on the map'
                          : 'Generate table first to enable rain effect'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                id="rain-toggle"
                checked={isRainActive}
                onCheckedChange={onToggleRain}
                disabled={!hasTable}
              />
            </div>
          )}

          {/* Flood Propagation Toggle */}
          {onToggleFloodPropagation && (
            <div
              className={`border-border/40 bg-muted/20 flex items-center justify-between rounded-lg border px-3 py-2 ${!hasTable ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-2">
                <Flame className="text-muted-foreground h-4 w-4" />
                <Label
                  htmlFor="heatmap-toggle"
                  className={`text-sm font-normal ${hasTable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  Flood Propagation
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <IconInfoCircleFilled className="h-3.5 w-3.5 cursor-help text-[#8D8D8D]/50 hover:text-[#8D8D8D]" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        {hasTable
                          ? 'Toggle vulnerability density heatmap showing flood-prone areas'
                          : 'Generate table first to enable heatmap'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                id="heatmap-toggle"
                checked={isFloodPropagationActive}
                onCheckedChange={onToggleFloodPropagation}
                disabled={!hasTable}
              />
            </div>
          )}
        </div>

        {/* footer anchored to bottom */}
        {/* Generate and Close Buttons (side-by-side) placed at bottom */}
        <div className="mt-auto">
          <div className="flex gap-2">
            <Button
              onClick={onGenerateTable}
              disabled={!selectedYear || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading Data...
                </>
              ) : (
                'Generate Table on Map'
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleToggleTable}
              disabled={isLoading || !hasTable || isTogglingTable}
              className="flex-none"
              aria-label={isTableMinimized ? 'Show table' : 'Hide table'}
            >
              {isTogglingTable ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isTableMinimized ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <Minimize2 className="h-4 w-4" />
              )}
            </Button>
          </div>

          <p className="text-muted-foreground mt-3 text-[10px]">
            The vulnerability data table will appear on the map and can be
            sorted and dragged to reposition.
          </p>
        </div>
      </div>
    </>
  );
}
