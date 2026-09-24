'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { Inlet, Drain } from '@/components/control-panel/types';

interface NodeParams {
  inv_elev: number;
  init_depth: number;
  ponding_area: number;
  surcharge_depth: number;
}

interface NodeParametersPanelProps {
  selectedComponentIds: string[];
  componentParams: Map<string, NodeParams>;
  onUpdateParam: (id: string, key: keyof NodeParams, value: number) => void;
  onClose: () => void;
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
  inlets: Inlet[];
  drains: Drain[];
}

const _MAX_VISIBLE_TABS = 5;

export function NodeParametersPanel({
  selectedComponentIds,
  componentParams,
  onUpdateParam,
  onClose,
  position,
  onPositionChange,
  inlets: _inlets,
  drains: _drains,
}: NodeParametersPanelProps) {
  const [activeTab, setActiveTab] = useState<string>(
    selectedComponentIds[0] || ''
  );
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
  } | null>(null);
  const tabsListRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update active tab when selections change
  useEffect(() => {
    if (
      selectedComponentIds.length > 0 &&
      !selectedComponentIds.includes(activeTab)
    ) {
      setActiveTab(selectedComponentIds[0]);
    }
  }, [selectedComponentIds, activeTab]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      target.closest &&
      target.closest(
        'input, textarea, select, button, [role="button"], [role="textbox"], .no-drag'
      )
    ) {
      return;
    }

    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
    e.preventDefault();
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !dragRef.current) return;

      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;

      onPositionChange({
        x: dragRef.current.startPosX + deltaX,
        y: dragRef.current.startPosY + deltaY,
      });
    },
    [isDragging, onPositionChange]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
    dragRef.current = null;
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      target.closest &&
      target.closest(
        'input, textarea, select, button, [role="button"], [role="textbox"], .no-drag'
      )
    ) {
      return;
    }

    const touch = e.touches[0];
    setIsDragging(true);
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || !dragRef.current) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - dragRef.current.startX;
      const deltaY = touch.clientY - dragRef.current.startY;

      onPositionChange({
        x: dragRef.current.startPosX + deltaX,
        y: dragRef.current.startPosY + deltaY,
      });
    },
    [isDragging, onPositionChange]
  );

  const handleTouchEnd = () => {
    setIsDragging(false);
    dragRef.current = null;
  };

  // Add event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleMouseMove, handleTouchMove]);

  // Prevent scrolling while dragging
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlTouch = document.documentElement.style.touchAction;

    if (isDragging) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.documentElement.style.touchAction = 'none';
    }

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.touchAction = prevHtmlTouch;
    };
  }, [isDragging]);

  const DEFAULT_NODE_PARAMS: NodeParams = {
    inv_elev: 0,
    init_depth: 0,
    ponding_area: 0,
    surcharge_depth: 0,
  };

  return (
    <div
      ref={containerRef}
      className="bg-background flex flex-col rounded-lg border pb-2 shadow-lg"
      style={{
        minWidth: '450px',
        maxWidth: '600px',
        maxHeight: 'calc(100vh - 120px)',
      }}
    >
      {/* Header */}
      <div
        className={cn(
          'bg-muted/50 flex items-center justify-between gap-2 rounded-t-lg border-b px-3 py-2',
          'cursor-grab active:cursor-grabbing',
          isDragging && 'cursor-grabbing select-none'
        )}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <h3 className="text-muted-foreground ml-2 text-sm font-semibold">
          Node Parameters
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="h-8 w-8"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {selectedComponentIds.length === 0 ? (
          <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
            No components selected
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Tab List with Horizontal Scrollbar */}
            <div className="tabs-scroll-container mb-4" ref={tabsListRef}>
              <TabsList className="inline-flex w-fit min-w-full justify-start">
                {selectedComponentIds.map((id) => (
                  <TabsTrigger
                    key={id}
                    value={id}
                    className="min-w-[80px] flex-shrink-0"
                  >
                    {id}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Tab Content */}
            {selectedComponentIds.map((id) => {
              const params = componentParams.get(id) || DEFAULT_NODE_PARAMS;
              return (
                <TabsContent
                  key={id}
                  value={id}
                  className="mt-0 space-y-4 px-2"
                >
                  {/* Inversion Elevation */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal">
                        Inversion Elevation
                      </Label>
                      <span className="text-muted-foreground text-xs">
                        {params.inv_elev.toFixed(1)} m
                      </span>
                    </div>
                    <Slider
                      value={[params.inv_elev]}
                      onValueChange={(value) =>
                        onUpdateParam(id, 'inv_elev', value[0])
                      }
                      min={0}
                      max={50}
                      step={0.5}
                      className="no-drag w-full"
                    />
                    <div className="text-muted-foreground flex justify-between text-xs">
                      <span>0 m</span>
                      <span>50 m</span>
                    </div>
                  </div>

                  {/* Initial Depth */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal">
                        Initial Depth
                      </Label>
                      <span className="text-muted-foreground text-xs">
                        {params.init_depth.toFixed(1)} m
                      </span>
                    </div>
                    <Slider
                      value={[params.init_depth]}
                      onValueChange={(value) =>
                        onUpdateParam(id, 'init_depth', value[0])
                      }
                      min={0}
                      max={10}
                      step={0.1}
                      className="no-drag w-full"
                    />
                    <div className="text-muted-foreground flex justify-between text-xs">
                      <span>0 m</span>
                      <span>10 m</span>
                    </div>
                  </div>

                  {/* Ponding Area */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal">
                        Ponding Area
                      </Label>
                      <span className="text-muted-foreground text-xs">
                        {params.ponding_area.toFixed(0)} m²
                      </span>
                    </div>
                    <Slider
                      value={[params.ponding_area]}
                      onValueChange={(value) =>
                        onUpdateParam(id, 'ponding_area', value[0])
                      }
                      min={0}
                      max={100}
                      step={1}
                      className="no-drag w-full"
                    />
                    <div className="text-muted-foreground flex justify-between text-xs">
                      <span>0 m²</span>
                      <span>100 m²</span>
                    </div>
                  </div>

                  {/* Surcharge Depth */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal">
                        Surcharge Depth
                      </Label>
                      <span className="text-muted-foreground text-xs">
                        {params.surcharge_depth.toFixed(1)} m
                      </span>
                    </div>
                    <Slider
                      value={[params.surcharge_depth]}
                      onValueChange={(value) =>
                        onUpdateParam(id, 'surcharge_depth', value[0])
                      }
                      min={0}
                      max={5}
                      step={0.1}
                      className="no-drag w-full"
                    />
                    <div className="text-muted-foreground flex justify-between text-xs">
                      <span>0 m</span>
                      <span>5 m</span>
                    </div>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </div>

      {/* Tabs scrollbar CSS */}
      <style jsx>{`
        .tabs-scroll-container {
          /* Always show scrollbar space to prevent layout shift */
          overflow-x: auto;
          overflow-y: visible;
          padding-bottom: 4px;
        }

        /* Webkit browsers (Chrome, Safari, Edge) */
        .tabs-scroll-container::-webkit-scrollbar {
          height: 10px;
          display: block;
        }

        .tabs-scroll-container::-webkit-scrollbar-track {
          background: hsl(var(--muted) / 0.3);
          border-radius: 5px;
        }

        .tabs-scroll-container::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground) / 0.4);
          border-radius: 5px;
        }

        .tabs-scroll-container::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--muted-foreground) / 0.6);
        }

        /* Firefox */
        .tabs-scroll-container {
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--muted-foreground) / 0.4)
            hsl(var(--muted) / 0.3);
        }
      `}</style>
    </div>
  );
}
