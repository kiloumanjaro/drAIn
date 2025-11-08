"use client";

import React, { useState, useEffect } from "react";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  AlertCircle,
  RotateCcw,
  Settings,
  Minimize2,
  Maximize2,
  CloudRain,
} from "lucide-react";
import { IconInfoCircleFilled } from "@tabler/icons-react";
import { LoadingScreen } from "@/components/loading-screen";
import { useInlets } from "@/hooks/useInlets";
import { useDrain } from "@/hooks/useDrain";
import { usePipes } from "@/hooks/usePipes";
import { toast } from "sonner";
import type { Inlet, Outlet, Pipe, Drain } from "../../types";

export interface NodeParams {
  inv_elev: number;
  init_depth: number;
  ponding_area: number;
  surcharge_depth: number;
}

export interface LinkParams {
  init_flow: number;
  upstrm_offset_depth: number;
  downstrm_offset_depth: number;
  avg_conduit_loss: number;
}

interface RainfallParams {
  total_precip: number;
  duration_hr: number;
}

interface Model3Props {
  selectedPointId?: string | null;
  selectedInlet?: Inlet | null;
  selectedOutlet?: Outlet | null;
  selectedPipe?: Pipe | null;
  selectedDrain?: Drain | null;
  // Lifted state
  selectedComponentIds: string[];
  onComponentIdsChange: (ids: string[]) => void;
  selectedPipeIds: string[];
  onPipeIdsChange: (ids: string[]) => void;
  componentParams: Map<string, NodeParams>;
  onComponentParamsChange: (params: Map<string, NodeParams>) => void;
  pipeParams: Map<string, LinkParams>;
  onPipeParamsChange: (params: Map<string, LinkParams>) => void;
  rainfallParams: RainfallParams;
  onRainfallParamsChange: (params: RainfallParams) => void;
  showNodePanel: boolean;
  onToggleNodePanel: () => void;
  showLinkPanel: boolean;
  onToggleLinkPanel: () => void;
  // Table props (similar to Model 2)
  onGenerateTable: () => void;
  isLoadingTable: boolean;
  onCloseTable?: () => void;
  hasTable?: boolean;
  isTableMinimized?: boolean;
  onToggleMinimize?: () => void;
  onOpenNodeSimulation?: (nodeId: string) => void;
  isRainActive?: boolean;
  onToggleRain?: (enabled: boolean) => void;
}

export const DEFAULT_NODE_PARAMS: NodeParams = {
  inv_elev: 0,
  init_depth: 0,
  ponding_area: 0,
  surcharge_depth: 0,
};

export const DEFAULT_LINK_PARAMS: LinkParams = {
  init_flow: 0,
  upstrm_offset_depth: 0,
  downstrm_offset_depth: 0,
  avg_conduit_loss: 0,
};

const DEFAULT_RAINFALL_PARAMS: RainfallParams = {
  total_precip: 140,
  duration_hr: 1,
};

export default function Model3({
  selectedPointId: externalSelectedPointId = null,
  selectedInlet: _selectedInlet = null,
  selectedOutlet: _selectedOutlet = null,
  selectedPipe: _selectedPipe = null,
  selectedDrain: _selectedDrain = null,
  selectedComponentIds,
  onComponentIdsChange,
  selectedPipeIds,
  onPipeIdsChange,
  componentParams,
  onComponentParamsChange,
  pipeParams,
  onPipeParamsChange,
  rainfallParams,
  onRainfallParamsChange,
  showNodePanel,
  onToggleNodePanel,
  showLinkPanel,
  onToggleLinkPanel,
  onGenerateTable,
  isLoadingTable,
  onCloseTable: _onCloseTable,
  hasTable = false,
  isTableMinimized = false,
  onToggleMinimize,
  isRainActive = false,
  onToggleRain,
}: Model3Props) {
  //const [rainfallParams, setRainfallParams] = useState<RainfallParams>(
  //  DEFAULT_RAINFALL_PARAMS
  //);
  const [error, setError] = useState<string | null>(null);

  // Load data from hooks
  const { inlets, loading: inletsLoading } = useInlets();
  const { drains, loading: drainsLoading } = useDrain();
  const { pipes, loading: pipesLoading } = usePipes();

  // Update selected components when external prop changes
  useEffect(() => {
    if (
      externalSelectedPointId &&
      !selectedComponentIds.includes(externalSelectedPointId)
    ) {
      onComponentIdsChange([...selectedComponentIds, externalSelectedPointId]);
    }
  }, [externalSelectedPointId, selectedComponentIds, onComponentIdsChange]);

  // Handle component selection changes - auto-populate params
  useEffect(() => {
    const newParams = new Map(componentParams);
    let paramsChanged = false;

    // Add new components
    selectedComponentIds.forEach((id) => {
      if (!newParams.has(id)) {
        const inlet = inlets.find((i) => i.id === id);
        const drain = drains.find((d) => d.id === id);

        if (inlet) {
          newParams.set(id, {
            inv_elev: inlet.Inv_Elev || 0,
            init_depth: 0,
            ponding_area: 0,
            surcharge_depth: 0,
          });
          toast.success(`Loaded parameters for ${id}`);
          paramsChanged = true;
        } else if (drain) {
          newParams.set(id, {
            inv_elev: drain.InvElev || 0,
            init_depth: 0,
            ponding_area: 0,
            surcharge_depth: 0,
          });
          toast.success(`Loaded parameters for ${id}`);
          paramsChanged = true;
        }
      }
    });

    // Remove deselected components
    Array.from(newParams.keys()).forEach((id) => {
      if (!selectedComponentIds.includes(id)) {
        newParams.delete(id);
        paramsChanged = true;
      }
    });

    if (paramsChanged) {
      onComponentParamsChange(newParams);
    }
  }, [
    selectedComponentIds,
    inlets,
    drains,
    componentParams,
    onComponentParamsChange,
  ]);

  // Handle pipe selection changes
  useEffect(() => {
    const newParams = new Map(pipeParams);
    let paramsChanged = false;

    // Add new pipes
    selectedPipeIds.forEach((id) => {
      if (!newParams.has(id)) {
        newParams.set(id, { ...DEFAULT_LINK_PARAMS });
        paramsChanged = true;
      }
    });

    // Remove deselected pipes
    Array.from(newParams.keys()).forEach((id) => {
      if (!selectedPipeIds.includes(id)) {
        newParams.delete(id);
        paramsChanged = true;
      }
    });

    if (paramsChanged) {
      onPipeParamsChange(newParams);
    }
  }, [selectedPipeIds, pipeParams, onPipeParamsChange]);

  const handleGenerateTableClick = () => {
    if (selectedComponentIds.length === 0) {
      setError("Please select at least one component (inlet or drain)");
      toast.error("Please select at least one component");
      return;
    }

    setError(null);
    onGenerateTable();
  };

  const handleReset = () => {
    onComponentIdsChange([]);
    onPipeIdsChange([]);
    onComponentParamsChange(new Map());
    onPipeParamsChange(new Map());
    onRainfallParamsChange(DEFAULT_RAINFALL_PARAMS);
    setError(null);
  };

  return (
    <>
      {/* Loading Screen */}
      <LoadingScreen
        title="Running SWMM Simulation"
        messages={[
          "Running SWMM simulation...",
          "Processing node parameters...",
          "Checking infrastructure health...",
          "Generating vulnerability results...",
        ]}
        isLoading={isLoadingTable}
        position="bottom-right"
      />

      <div className="flex flex-col flex-1 pt-3 pb-5 pl-5 pr-4 space-y-4">
        <CardHeader className="py-0 px-1 mb-6">
          <CardTitle>Infrastructure Health Model</CardTitle>
          <CardDescription className="text-xs">
            Assess structural integrity and maintenance requirements using SWMM
            simulation
          </CardDescription>
        </CardHeader>

        <div className="flex flex-col gap-4">
          {/* Component Multi-Select with Gear Button */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-base">Component Selection</h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconInfoCircleFilled className="w-3.5 h-3.5 text-[#8D8D8D]/50 hover:text-[#8D8D8D] cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-xs">
                      Select multiple inlets or drains to include in the
                      simulation
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <MultiSelect
                  options={[
                    ...inlets.map((inlet) => ({
                      value: inlet.id,
                      label: `${inlet.id} (Inlet)`,
                    })),
                    ...drains.map((drain) => ({
                      value: drain.id,
                      label: `${drain.id} (Storm Drain)`,
                    })),
                  ]}
                  selected={selectedComponentIds}
                  onChange={onComponentIdsChange}
                  placeholder="Select components..."
                  searchPlaceholder="Search ID"
                  emptyText="No components found."
                  disabled={inletsLoading || drainsLoading}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={onToggleNodePanel}
                disabled={selectedComponentIds.length === 0}
                className={showNodePanel ? "bg-muted" : ""}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Pipe Multi-Select with Gear Button */}
          <div className="space-y-2 mb-2">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm">Pipe Selection (Optional)</h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconInfoCircleFilled className="w-3.5 h-3.5 text-[#8D8D8D]/50 hover:text-[#8D8D8D] cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-xs">
                      Select pipes to include link parameters in the simulation
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <MultiSelect
                  options={pipes.map((pipe) => ({
                    value: pipe.id,
                    label: pipe.id,
                  }))}
                  selected={selectedPipeIds}
                  onChange={onPipeIdsChange}
                  placeholder="Select pipes (optional)..."
                  searchPlaceholder="Search pipe ID"
                  emptyText="No pipes found."
                  disabled={pipesLoading}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={onToggleLinkPanel}
                disabled={selectedPipeIds.length === 0}
                className={showLinkPanel ? "bg-muted" : ""}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Rainfall Parameters */}
          <div className="space-y-4 px-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm ">Rainfall Parameters</h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconInfoCircleFilled className="w-3.5 h-3.5 text-[#8D8D8D]/50 hover:text-[#8D8D8D] cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs max-w-xs">
                      Configure rainfall event parameters for the simulation
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Total Precipitation */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="font-normal text-sm">
                  Total Precipitation
                </Label>
                <span className="text-xs text-muted-foreground">
                  {rainfallParams.total_precip.toFixed(0)} mm
                </span>
              </div>
              <Slider
                value={[rainfallParams.total_precip]}
                onValueChange={(value) =>
                  onRainfallParamsChange({
                    ...rainfallParams,
                    total_precip: value[0],
                  })
                }
                min={0}
                max={300}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 mm</span>
                <span>300 mm</span>
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="font-normal text-sm">Duration</Label>
                <span className="text-xs text-muted-foreground">
                  {rainfallParams.duration_hr.toFixed(1)} hr
                </span>
              </div>
              <Slider
                value={[rainfallParams.duration_hr]}
                onValueChange={(value) =>
                  onRainfallParamsChange({
                    ...rainfallParams,
                    duration_hr: value[0],
                  })
                }
                min={0.5}
                max={24}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.5 hr</span>
                <span>24 hr</span>
              </div>
            </div>
          </div>

          {/* Rain Effect Toggle */}
          {onToggleRain && (
            <div
              className={`flex items-center justify-between px-3 py-2 rounded-lg border border-border/40 bg-muted/20 ${
                !hasTable ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <CloudRain className="h-4 w-4 text-muted-foreground" />
                <Label
                  htmlFor="rain-toggle-model3"
                  className={`text-sm font-normal ${
                    hasTable ? "cursor-pointer" : "cursor-not-allowed"
                  }`}
                >
                  Rain Effect
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <IconInfoCircleFilled className="w-3.5 h-3.5 text-[#8D8D8D]/50 hover:text-[#8D8D8D] cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-xs">
                        {hasTable
                          ? "Toggle rainfall visualization effect (intensity based on precipitation)"
                          : "Generate table first to enable rain effect"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Switch
                id="rain-toggle-model3"
                checked={isRainActive}
                onCheckedChange={onToggleRain}
                disabled={!hasTable}
              />
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Generate and Close Buttons (side-by-side) placed at bottom */}
        <div className="mt-auto">
          <div className="flex gap-2">
            <Button
              onClick={handleGenerateTableClick}
              disabled={selectedComponentIds.length === 0 || isLoadingTable}
              className="flex-1"
            >
              {isLoadingTable ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Loading Data...
                </>
              ) : (
                "Generate Table on Map"
              )}
            </Button>

            <Button
              onClick={handleReset}
              variant="outline"
              size="icon"
              disabled={isLoadingTable}
              aria-label="Reset simulation parameters"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>

            {onToggleMinimize && (
              <Button
                variant="outline"
                onClick={() => onToggleMinimize()}
                disabled={isLoadingTable || !hasTable}
                className="flex-none"
                aria-label={isTableMinimized ? "Show table" : "Hide table"}
              >
                {isTableMinimized ? (
                  <Maximize2 className="h-4 w-4" />
                ) : (
                  <Minimize2 className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground mt-3">
            The vulnerability data table will appear on the map and can be
            sorted and dragged to reposition.
          </p>
        </div>
      </div>
    </>
  );
}
