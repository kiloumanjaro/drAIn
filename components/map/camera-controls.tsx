'use client';

import { FC } from 'react';
import { Plus, Minus, Crosshair, Map as MapIcon, X } from 'lucide-react';
import WidgetTrigger from '@/components/shell/widget-trigger';

type CameraControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetPosition: () => void;
  /** Left out where the style is fixed (simulation); the button then goes. */
  onChangeStyle?: () => void;
  isSimulationActive?: boolean;
  onExitSimulation?: () => void;
};

export const CameraControls: FC<CameraControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onResetPosition,
  onChangeStyle,
  isSimulationActive,
  onExitSimulation,
}) => {
  return (
    // The column spans the map's height to pin its two groups top and
    // bottom; only the groups themselves take clicks, or the strip between
    // them would swallow clicks meant for whatever lies under it. On phones
    // and tablets the control panel's sheet covers the bottom, so both groups
    // sit at the top. A tablet-width screen under 480px high (a large phone
    // on its side) has no room for both above the half-open sheet, where
    // before it had the desktop layout and showed them all; there the two
    // groups go side by side, the second to the left of the first. The
    // simulation has no second group but one more button in the first (exit),
    // which pushed the last of them behind the sheet; there the exit button
    // takes the second group's place.
    <div className="pointer-events-none absolute right-0 z-30 mx-5 flex h-full flex-col items-end justify-between py-5 max-lg:justify-start max-lg:gap-2 md:max-lg:[@media(height_<_480px)]:flex-row-reverse md:max-lg:[@media(height_<_480px)]:items-start">
      <div className="pointer-events-auto relative flex flex-col items-end gap-2">
        {/* Exit button when simulation is active */}
        {isSimulationActive && onExitSimulation && (
          <button
            onClick={onExitSimulation}
            aria-label="Exit simulation"
            className="rounded-sm border border-[#770504] bg-[#c53231] p-2 shadow-md hover:bg-[#a10018] active:border active:border-[#770504] active:bg-[#c53231] active:text-black md:max-lg:[@media(height_<_480px)]:absolute md:max-lg:[@media(height_<_480px)]:top-0 md:max-lg:[@media(height_<_480px)]:right-full md:max-lg:[@media(height_<_480px)]:mr-2"
          >
            <X className="h-4 w-4 cursor-pointer text-white" />
          </button>
        )}

        {/* Zoom In / Zoom Out. The pair is clipped to its rounded corners, so
            the focus ring is drawn inside each button. */}
        <div className="flex flex-col overflow-hidden rounded-sm bg-white shadow-md">
          <button
            onClick={onZoomIn}
            aria-label="Zoom in"
            className="rounded-t-sm border border-transparent border-b-gray-200 p-2 hover:bg-gray-100 focus-visible:-outline-offset-2 active:border active:border-gray-300 active:bg-gray-300 active:text-black"
          >
            <Plus className="h-4 w-4 cursor-pointer" />
          </button>
          <button
            onClick={onZoomOut}
            aria-label="Zoom out"
            className="rounded-b-sm border border-transparent border-b-gray-200 p-2 hover:bg-gray-100 focus-visible:-outline-offset-2 active:border active:border-gray-300 active:bg-gray-300 active:text-black"
          >
            <Minus className="h-4 w-4 cursor-pointer" />
          </button>
        </div>

        {/* Reset Position */}
        <button
          onClick={onResetPosition}
          aria-label="Reset map position"
          className="rounded-sm border border-transparent bg-white p-2 shadow-md hover:bg-gray-100 active:border active:border-gray-300 active:bg-gray-200 active:text-black"
        >
          <Crosshair className="h-4 w-4 cursor-pointer" />
        </button>

        {/* Widget Trigger */}
        <WidgetTrigger />
      </div>

      {onChangeStyle && (
        <button
          onClick={() => {
            onChangeStyle();
          }}
          aria-label="Change map style"
          className="pointer-events-auto rounded-sm border border-transparent bg-white p-2 shadow-md hover:bg-gray-100 active:border active:border-gray-400 active:bg-gray-300 active:text-black"
        >
          <MapIcon className="h-4 w-4 cursor-pointer" />
        </button>
      )}
    </div>
  );
};
