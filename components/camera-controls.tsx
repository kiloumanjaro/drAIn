'use client';

import { FC } from 'react';
import { Plus, Minus, Crosshair, Map as MapIcon, X } from 'lucide-react';
import WidgetTrigger from '@/components/WidgetTrigger';

type CameraControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetPosition: () => void;
  onChangeStyle: () => void;
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
    <div className="absolute right-0 z-30 mx-5 flex h-full flex-col items-end justify-between py-5">
      <div className="flex flex-col items-end gap-2">
        {/* Exit button when simulation is active */}
        {isSimulationActive && onExitSimulation && (
          <button
            onClick={onExitSimulation}
            className="rounded-sm border border-[#770504] bg-[#c53231] p-2 shadow-md hover:bg-[#a10018] active:border active:border-[#770504] active:bg-[#c53231] active:text-black"
          >
            <X className="h-4 w-4 cursor-pointer text-white" />
          </button>
        )}

        {/* Zoom In / Zoom Out */}
        <div className="flex flex-col overflow-hidden rounded-sm bg-white shadow-md">
          <button
            onClick={onZoomIn}
            className="rounded-x-md rounded-t-sm border border-transparent border-b-gray-200 p-2 hover:bg-gray-100 active:border active:border-gray-300 active:bg-gray-300 active:text-black"
          >
            <Plus className="h-4 w-4 cursor-pointer" />
          </button>
          <button
            onClick={onZoomOut}
            className="rounded-x-md rounded-t-sm border border-transparent border-b-gray-200 p-2 hover:bg-gray-100 active:border active:border-gray-300 active:bg-gray-300 active:text-black"
          >
            <Minus className="h-4 w-4 cursor-pointer" />
          </button>
        </div>

        {/* Reset Position */}
        <button
          onClick={onResetPosition}
          className="rounded-sm border border-transparent bg-white p-2 shadow-md hover:bg-gray-100 active:border active:border-gray-300 active:bg-gray-200 active:text-black"
        >
          <Crosshair className="h-4 w-4 cursor-pointer" />
        </button>

        {/* Widget Trigger */}
        <WidgetTrigger />
      </div>

      <button
        onClick={() => {
          onChangeStyle();
        }}
        className="rounded-sm border border-transparent bg-white p-2 shadow-md hover:bg-gray-100 active:border active:border-gray-400 active:bg-gray-300 active:text-black"
      >
        <MapIcon className="h-4 w-4 cursor-pointer" />
      </button>
    </div>
  );
};
