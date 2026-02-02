'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface LinkParams {
  init_flow: number;
  upstrm_offset_depth: number;
  downstrm_offset_depth: number;
  avg_conduit_loss: number;
}

interface LinkParametersPanelProps {
  selectedPipeIds: string[];
  pipeParams: Map<string, LinkParams>;
  onUpdateParam: (id: string, key: keyof LinkParams, value: number) => void;
  onClose: () => void;
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
}

const _MAX_VISIBLE_TABS = 5;

export function LinkParametersPanel({
  selectedPipeIds,
  pipeParams,
  onUpdateParam,
  onClose,
  position,
  onPositionChange,
}: LinkParametersPanelProps) {
  const [activeTab, setActiveTab] = useState<string>(selectedPipeIds[0] || '');
  const [isDragging, setIsDragging] = useState(false);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);
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
    if (selectedPipeIds.length > 0 && !selectedPipeIds.includes(activeTab)) {
      setActiveTab(selectedPipeIds[0]);
    }
  }, [selectedPipeIds, activeTab]);

  // Check scroll buttons visibility
  useEffect(() => {
    const checkScroll = () => {
      if (tabsListRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = tabsListRef.current;
        setShowLeftScroll(scrollLeft > 0);
        setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 1);
      }
    };

    checkScroll();
    const tabsList = tabsListRef.current;
    tabsList?.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      tabsList?.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [selectedPipeIds]);

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

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsListRef.current) {
      const scrollAmount = 200;
      tabsListRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const DEFAULT_LINK_PARAMS: LinkParams = {
    init_flow: 0,
    upstrm_offset_depth: 0,
    downstrm_offset_depth: 0,
    avg_conduit_loss: 0,
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
          Link Parameters
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
        {selectedPipeIds.length === 0 ? (
          <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
            No pipes selected
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Tab List with Scroll Buttons */}
            <div className="relative mb-4">
              {showLeftScroll && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-background/80 hover:bg-background no-drag absolute top-0 left-0 z-10 h-10 w-8 rounded-none"
                  onClick={() => scrollTabs('left')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}

              <div
                ref={tabsListRef}
                className="scrollbar-hide overflow-x-auto"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                <TabsList className="w-full justify-start">
                  {selectedPipeIds.map((id) => (
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

              {showRightScroll && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-background/80 hover:bg-background no-drag absolute top-0 right-0 z-10 h-10 w-8 rounded-none"
                  onClick={() => scrollTabs('right')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Tab Content */}
            {selectedPipeIds.map((id) => {
              const params = pipeParams.get(id) || DEFAULT_LINK_PARAMS;
              return (
                <TabsContent
                  key={id}
                  value={id}
                  className="mt-0 space-y-4 px-2"
                >
                  {/* Initial Flow */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal">
                        Initial Flow
                      </Label>
                      <span className="text-muted-foreground text-xs">
                        {params.init_flow.toFixed(2)} m³/s
                      </span>
                    </div>
                    <Slider
                      value={[params.init_flow]}
                      onValueChange={(value) =>
                        onUpdateParam(id, 'init_flow', value[0])
                      }
                      min={0}
                      max={5}
                      step={0.1}
                      className="no-drag w-full"
                    />
                    <div className="text-muted-foreground flex justify-between text-xs">
                      <span>0 m³/s</span>
                      <span>5 m³/s</span>
                    </div>
                  </div>

                  {/* Upstream Offset Depth */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal">
                        Upstream Offset
                      </Label>
                      <span className="text-muted-foreground text-xs">
                        {params.upstrm_offset_depth.toFixed(1)} m
                      </span>
                    </div>
                    <Slider
                      value={[params.upstrm_offset_depth]}
                      onValueChange={(value) =>
                        onUpdateParam(id, 'upstrm_offset_depth', value[0])
                      }
                      min={0}
                      max={20}
                      step={0.5}
                      className="no-drag w-full"
                    />
                    <div className="text-muted-foreground flex justify-between text-xs">
                      <span>0 m</span>
                      <span>20 m</span>
                    </div>
                  </div>

                  {/* Downstream Offset Depth */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal">
                        Downstream Offset
                      </Label>
                      <span className="text-muted-foreground text-xs">
                        {params.downstrm_offset_depth.toFixed(1)} m
                      </span>
                    </div>
                    <Slider
                      value={[params.downstrm_offset_depth]}
                      onValueChange={(value) =>
                        onUpdateParam(id, 'downstrm_offset_depth', value[0])
                      }
                      min={0}
                      max={20}
                      step={0.5}
                      className="no-drag w-full"
                    />
                    <div className="text-muted-foreground flex justify-between text-xs">
                      <span>0 m</span>
                      <span>20 m</span>
                    </div>
                  </div>

                  {/* Average Conduit Loss */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-normal">
                        Avg Conduit Loss
                      </Label>
                      <span className="text-muted-foreground text-xs">
                        {params.avg_conduit_loss.toFixed(1)}
                      </span>
                    </div>
                    <Slider
                      value={[params.avg_conduit_loss]}
                      onValueChange={(value) =>
                        onUpdateParam(id, 'avg_conduit_loss', value[0])
                      }
                      min={0}
                      max={100}
                      step={1}
                      className="no-drag w-full"
                    />
                    <div className="text-muted-foreground flex justify-between text-xs">
                      <span>0</span>
                      <span>100</span>
                    </div>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </div>

      {/* Hide scrollbar CSS */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
