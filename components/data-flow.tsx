// components/DataFlowPipeline.tsx
'use client';

/**
 * DataFlowPipeline - Animated pipe flow visualization with optional interactive map background
 *
 * @example
 * // Basic usage with map background
 * <DataFlowPipeline background showMap mapOpacity={0.2} />
 *
 * @example
 * // Interactive map - ENTIRE SHAPE AREA is hoverable (not just thin border)
 * // Paths fill with color on hover with TRAIL EFFECT following cursor
 * <DataFlowPipeline
 *   background
 *   showMap
 *   mapOpacity={0.2}
 *   enableHover
 *   hoverColor="#3b82f6"
 *   fillOnHover={true}      // Default: true - makes full shape hoverable
 *   fillOpacity={0.2}       // Default: 0.2 - fill opacity on hover
 *   hoverTrailDelay={300}   // Default: 300ms - delay before hover effect fades (trail effect)
 * />
 *
 * @example
 * // Hover only on border (harder to target, legacy behavior)
 * <DataFlowPipeline
 *   background
 *   showMap
 *   enableHover
 *   fillOnHover={false}  // Only border stroke is hoverable
 * />
 *
 * @example
 * // With hover callbacks for external state management
 * <DataFlowPipeline
 *   background
 *   showMap
 *   enableHover
 *   onPathHover={(pathId) => console.log('Hovering:', pathId)}
 *   onPathClick={(pathId) => alert('Clicked:', pathId)}
 * />
 *
 * @example
 * // Without map, as inline element
 * <DataFlowPipeline cover={false} />
 *
 * @example
 * // High opacity map for testing
 * <DataFlowPipeline background showMap mapOpacity={0.5} debug />
 */

import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';

type Props = {
  /** render as absolutely-positioned background filling its parent */
  background?: boolean;
  /** when true -> preserveAspectRatio = 'xMidYMid slice' (cover); else 'meet' (fit) */
  cover?: boolean;
  /** debug visual background to confirm element exists (remove in prod) */
  debug?: boolean;
  /** show the map SVG as background layer */
  showMap?: boolean;
  /** opacity of the map background (0-1) */
  mapOpacity?: number;
  /** enable hover interactions on map paths */
  enableHover?: boolean;
  /** color to use when hovering over a path */
  hoverColor?: string;
  /** fill the shape on hover (makes entire area hoverable, not just border) */
  fillOnHover?: boolean;
  /** opacity of fill on hover (0-1) */
  fillOpacity?: number;
  /** delay before hover effect disappears, creating a trail effect (ms) */
  hoverTrailDelay?: number;
  /** callback when a path is hovered */
  onPathHover?: (pathId: string | null) => void;
  /** callback when a path is clicked */
  onPathClick?: (pathId: string) => void;
  className?: string;
};

export default function DataFlowPipeline({
  background = false,
  cover = true,
  debug = false,
  showMap = false,
  mapOpacity = 0.15,
  enableHover = false,
  hoverColor = '#3b82f6',
  fillOnHover = true,
  fillOpacity = 0.2,
  hoverTrailDelay = 300,
  onPathHover,
  onPathClick,
  className = '',
}: Props) {
  const preserve = cover ? 'xMidYMid slice' : 'xMidYMid meet';

  // Animation delay state
  const [startAnim, setStartAnim] = useState(false);

  // Hover state for map paths - now tracks trail of recent hovers
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [trailingPaths, setTrailingPaths] = useState<Set<string>>(new Set());
  const hoverTimeoutRef = React.useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    const timer = setTimeout(() => setStartAnim(true), 400); // 400ms delay before animation starts
    return () => clearTimeout(timer);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    const timeouts = hoverTimeoutRef.current;
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  // Event delegation handlers - handle at group level to prevent multiple triggers
  const handleGroupClick = (event: React.MouseEvent<SVGGElement>) => {
    if (!enableHover) return;

    const target = event.target as SVGPathElement;
    if (target.tagName === 'path') {
      const pathId = target.getAttribute('data-path-id');
      if (pathId) {
        console.log('Click detected on:', pathId);
        onPathClick?.(pathId);
      }
    }
  };

  const handleGroupMouseMove = (event: React.MouseEvent<SVGGElement>) => {
    if (!enableHover) return;

    const target = event.target as SVGPathElement;
    if (target.tagName === 'path') {
      const pathId = target.getAttribute('data-path-id');
      if (pathId && pathId !== hoveredPath) {
        console.log('Hover detected on:', pathId);

        // Set current hovered path immediately
        setHoveredPath(pathId);
        onPathHover?.(pathId);

        // Add to trailing paths
        setTrailingPaths((prev) => new Set(prev).add(pathId));

        // Clear any existing timeout for this path
        const existingTimeout = hoverTimeoutRef.current.get(pathId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Set timeout to remove from trailing paths after delay
        const timeout = setTimeout(() => {
          setTrailingPaths((prev) => {
            const newSet = new Set(prev);
            newSet.delete(pathId);
            return newSet;
          });
          hoverTimeoutRef.current.delete(pathId);
        }, hoverTrailDelay);

        hoverTimeoutRef.current.set(pathId, timeout);
      }
    } else if (hoveredPath) {
      // Mouse left all paths - clear current hover immediately
      setHoveredPath(null);
      onPathHover?.(null);
      // Trail paths will fade out based on their timeouts
    }
  };

  const handleGroupMouseLeave = () => {
    if (enableHover && hoveredPath) {
      setHoveredPath(null);
      onPathHover?.(null);
      // Trail paths will continue to fade out based on their timeouts
    }
  };

  // Helper function to get path props for hover effects
  // Event delegation approach: paths just get styling, events handled at group level
  const getPathProps = (pathId: string) => {
    if (!enableHover) return {};

    const isCurrentHover = hoveredPath === pathId;
    const isInTrail = trailingPaths.has(pathId);
    const isHighlighted = isCurrentHover || isInTrail;

    // Trail effect: current hover at full opacity, trailing paths at reduced opacity
    const trailOpacity = isCurrentHover ? fillOpacity : fillOpacity * 0.5;

    return {
      // Data attribute to identify path for event delegation
      'data-path-id': pathId,

      // Stroke styling - highlight if current or in trail
      stroke: isHighlighted ? hoverColor : 'currentColor',
      strokeWidth: isCurrentHover ? 1.7 : isInTrail ? 0.5 : 1.4,

      // Fill makes entire shape area hoverable
      // KEY: Always use a fill when fillOnHover is true, with very low opacity
      fill: fillOnHover ? hoverColor : 'none',
      fillOpacity: fillOnHover ? (isHighlighted ? trailOpacity : 0) : 0,

      // Smooth transitions for trail effect
      className: 'transition-all duration-200 cursor-pointer',

      // CRITICAL: Use fill for pointer-events
      style: {
        pointerEvents: fillOnHover ? ('fill' as const) : ('stroke' as const),
      },
    };
  };

  // Outer wrapper: if used as background, make it absolute inset-0 and full size of parent.
  const outerClasses = background
    ? `absolute inset-0 w-full h-full ${className}`
    : `relative w-full ${className}`;

  // debugBg helps you see the element while debugging — set debug={true} to show.
  const debugBg = debug ? 'bg-red-200' : '';

  // Conditionally enable pointer events when hover is enabled
  const pointerEvents =
    enableHover && showMap ? 'pointer-events-auto' : 'pointer-events-none';

  return (
    <div
      className={`${outerClasses} ${debugBg} overflow-hidden ${pointerEvents}`}
    >
      <div className="h-full w-full">
        <svg
          className="block h-full w-full"
          viewBox="0 0 1920 1080"
          preserveAspectRatio={preserve}
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-hidden="true"
        >
          <defs>
            <filter
              id="innerShadow"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
              <feOffset in="blur" dx="0" dy="0" result="offsetBlur" />
              <feFlood floodColor="#000000" floodOpacity="0.3" result="color" />
              <feComposite
                in="color"
                in2="offsetBlur"
                operator="in"
                result="shadow"
              />
              <feComposite
                in="shadow"
                in2="SourceAlpha"
                operator="in"
                result="innerShadow"
              />
            </filter>
          </defs>

          <defs>
            {/* Define a diagonal hatch pattern */}
            <pattern
              id="diagonalHatch"
              patternUnits="userSpaceOnUse"
              width="6"
              height="6"
              patternTransform="rotate(45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="6"
                stroke="black"
                strokeWidth="1.3"
                opacity="0.3"
              />
            </pattern>

            {/* Gradient for flowing stroke */}
            <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a0a6f0" />
              <stop offset="50%" stopColor="#8fc5dd" />
              <stop offset="100%" stopColor="#a0a6f0" />
            </linearGradient>

            {/* Glow filter */}
            <filter id="flowGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation="4"
                result="blur"
              />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Map SVG Background Layer */}
          {showMap && (
            <g
              opacity={mapOpacity}
              transform="translate(23, 3) scale(1.0)"
              className="text-[#d6d6d6] dark:text-blue-600"
              stroke="currentColor"
              strokeWidth="0.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              onClick={handleGroupClick}
              onMouseMove={handleGroupMouseMove}
              onMouseLeave={handleGroupMouseLeave}
            >
              {/* Map paths from public/icons/map.svg - Interactive when enableHover=true */}
              <path
                d="M0 109.4V87.27h26.36v22.12h-.5c-4.85.01-9.7 0-14.54 0H0Z"
                {...getPathProps(`path-0`)}
              />
              <path
                d="M248.35 243.6v-.5c-.03-10.79-.02-21.58-.02-32.37V191.9h.5c7.24-.03 14.49-.02 21.73-.02h16.86c.02-18.88.01-37.76.01-56.64V87.28h15.78V243.6h-.5c-10.23.01-20.46.01-30.68 0h-23.69Z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M69.05 109.4c-10.51 0-21.02 0-31.54-.01h-.5v-.5c-.02-3.35-.02-6.7-.01-10.05 0-3.69 0-7.38-.02-11.07h.49v-.5h75.55v22.12h-1.69c-14.09 0-28.18.01-42.27.01Z"
                {...getPathProps(`path-1`)}
              />
              <path
                d="M196.48 198.16h-76v-.5c-.02-36.64-.02-73.26 0-109.89v-.5h76.01v110.89Z"
                {...getPathProps(`path-2`)}
              />
              <path
                d="M244.37 184.43c-8.38 0-16.76 0-25.13-.01h-.5v-39.15c0-19.17 0-38.33.01-57.5v-.5h60.16v97.15h-.5c-11.34 0-22.69.01-34.03.01Z"
                {...getPathProps(`path-3`)}
              />
              <path
                d="M248.35 243.6v-.5c-.03-10.79-.02-21.58-.02-32.37V191.9h.5c7.24-.03 14.49-.02 21.73-.02h16.86c.02-18.88.01-37.76.01-56.64V87.28h15.78V243.6h-.5c-10.23.01-20.46.01-30.68 0h-23.69Z"
                {...getPathProps(`path-4`)}
              />
              <path
                d="M431.21 244.67c-6.24 0-13.57-.31-22.15-.67-19.52-.82-46.26-1.95-81.99-.4l-.52.02v-.52c-.02-38.99-.01-77.98-.01-116.97V87.78h.49v-.5h22.69v72.83c8.87-2.24 17.54-6.16 25.93-9.96 5.31-2.4 10.79-4.88 16.28-6.92 1.95-10.74 1.58-22.28 1.23-33.44-.23-7.28-.47-14.81-.06-22.05l.03-.47h19.99v58.11c17.09.02 34.18 0 51.27.02h.5v.5c.07 10.08.21 19.23.33 27.3.58 39.08.85 56.91-7.67 65.2-5.09 4.95-13.37 6.28-26.33 6.28Z"
                {...getPathProps(`path-5`)}
              />
              <path
                d="M359.29 146.13v-.74c-.01-10.93-.01-21.87 0-32.81V87.27h25.3v17.86c0 10.04 0 20.08-.02 30.12v.33l-.31.13c-2.12.89-4.23 1.79-6.35 2.68-5.86 2.48-11.92 5.05-17.93 7.46l-.69.27Z"
                {...getPathProps(`path-6`)}
              />
              <path
                d="M443.54 136.89c-6.78 0-13.57 0-20.36-.01h-.5v-12.65c0-12.15 0-24.3.02-36.45v-.5h42.19v19.99c0 9.71 0 19.41-.01 29.12v.5h-21.35Z"
                {...getPathProps(`path-7`)}
              />
              <path
                d="M602.35 144.21v-1.08c-.06-4.1-.05-8.25-.05-12.28v-5.61h-81.35v-.5c-.02-12.13-.01-24.25 0-36.38v-1.1h70.14l.15.2c2.79 3.78 5.57 7.55 8.35 11.33 8.73 11.86 17.76 24.13 26.78 36.09l.64.85-1.06-.05c-11.7-.55-14.04.25-22.79 7.81l-.81.7Z"
                {...getPathProps(`path-8`)}
              />
              <path
                d="M729.49 135.83c-26.7 0-53.39 0-80.08-.02h-.25l-.15-.2c-3.93-5.29-7.89-10.56-11.85-15.83-7.77-10.35-15.8-21.04-23.51-31.71l-.57-.79h213.2v48.54H729.5Z"
                {...getPathProps(`path-9`)}
              />
              <path
                d="M868.71 205.56h-27.57v-.5c-.01-22.27 0-44.52 0-66.78v-50.5h.5v-.49h179.08v42.23l-.53-.03c-22.42-1.41-54.89-.43-82.24 12.23s-42.9 33.99-46.21 63.39l-.05.44h-.45c-7.5.02-15.01.02-22.51.02Z"
                {...getPathProps(`path-10`)}
              />
              <path
                d="M1044.33 129.48c-4.17 0-8.33 0-12.5-.01h-.5v-.5c-.01-6.1-.01-12.19 0-18.29 0-7.64 0-15.27-.02-22.91v-.5h30.61v42.2h-.5c-5.69 0-11.39.01-17.08.01Z"
                {...getPathProps(`path-11`)}
              />
              <path
                d="M1123.23 129.5c-17.12 0-34.25 0-51.25-.02h-.5v-42.2h103.51v14.73h-.49c-2.98.02-5.96.02-8.93.01h-7.47q-.03 6.375 0 12.72c2.49.01 4.98 0 7.48 0 2.97 0 5.95 0 8.93.01h.5v14.71h-.5c-17 .01-34.13.02-51.25.02Z"
                {...getPathProps(`path-12`)}
              />
              <path
                d="M1198.26 129.49h-16.87v-.5c-.03-4.58-.02-9.15 0-13.73v-.5l.5-.01c2.64-.02 5.28-.02 7.93-.01h7.43v-12.73c-2.47-.02-4.94-.01-7.41 0-2.65 0-5.3.01-7.94-.01h-.49V87.77h.5v-.49h33.27v42.2h-.5c-5.46 0-10.92.01-16.37.01Z"
                {...getPathProps(`path-13`)}
              />
              <path
                d="M1232.06 129.49c-2.99 0-5.98 0-8.96-.01h-.5v-.5q-.015-10.23 0-20.46V87.28h18.97v16.9c0 8.27 0 16.54-.01 24.81v.5h-9.48Z"
                {...getPathProps(`path-14`)}
              />
              <path
                d="M1275.3 129.48h-26.27v-.5c-.03-8.07-.03-16.14-.02-24.22v-17.5h32.32l-.66.81c-6.26 7.74-5.79 17.97-5.33 27.86.2 4.38.41 8.9.01 13.08l-.04.45Z"
                {...getPathProps(`path-15`)}
              />
              <path
                d="M1302.46 100.95c-5.33 0-10.65 0-15.97-.02h-.42l-.07-.42c-1.02-6.1 2.54-11.91 8.11-13.23h.12l32.93-.01v13.67h-24.68Z"
                {...getPathProps(`path-16`)}
              />
              <path
                d="M1349.37 129.49c-4.75 0-9.51 0-14.26-.01h-.5v-.5c-.02-7.47-.01-14.94-.01-22.41V87.28h29.54v42.2h-.5c-4.75.01-9.51.02-14.26.02Z"
                {...getPathProps(`path-17`)}
              />
              <path
                d="M1410.7 106.23c-7.59 0-15.18 0-22.78-.01h-.5v-.5c0-5.98 0-11.97.01-17.95v-.5h54.88v18.95h-.5c-10.37 0-20.74.01-31.11.01"
                {...getPathProps(`path-18`)}
              />
              <path
                d="M1467.76 106.25c-5.43 0-10.88-.02-16.3-.1h-.5v-.51c.07-6.29.08-12.13 0-17.87v-.51h36.58v6.57c0 3.95 0 7.89.03 11.84v.5l-2.1.01c-5.83.03-11.77.06-17.73.06Z"
                {...getPathProps(`path-19`)}
              />
              <path
                d="M1512.44 106.23h-17.22v-.5c-.04-5.25-.04-10.79 0-17.97v-.5h30.57v18.94h-.5c-4.29.02-8.57.02-12.86.02Z"
                {...getPathProps(`path-20`)}
              />
              <path
                d="M1572.39 128.46c-5.15 0-10.28-.02-15.34-.04-6.93-.03-14.09-.05-21.13-.03h-.5V87.27h100.06l-1.55.93c-13.81 8.28-25.8 21.66-35.65 39.75l-.14.25h-.29c-8.45.2-17 .26-25.47.26Z"
                {...getPathProps(`path-21`)}
              />
              <path
                d="M1874.5 198.16h-84.51l.04-.53c1.49-21.58-3.18-37.63-14.29-49.05-23.39-24.06-71.17-22.12-113.33-20.42-17.04.69-33.13 1.34-46.46.25l-.83-.07.44-.7c10.45-16.42 26.13-28.73 41.37-39.91l-.44-.44h218v110.89Z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M1874.5 198.16h-84.51l.04-.53c1.49-21.58-3.18-37.63-14.29-49.05-23.39-24.06-71.17-22.12-113.33-20.42-17.04.69-33.13 1.34-46.46.25l-.83-.07.44-.7c10.45-16.42 26.13-28.73 41.37-39.91l-.44-.44h218v110.89Z"
                {...getPathProps(`path-22`)}
              />
              <path
                d="M1308.41 129.49h-22.42v-5.04c0-4.47 0-8.95.02-13.41v-.5h10.65c9.99 0 19.98 0 29.97.01h.5v.5c.01 3.44 0 6.88 0 10.32v8.11h-.5c-6.08.02-12.16.02-18.23.02Z"
                {...getPathProps(`path-23`)}
              />
              <path
                d="M1410.71 129.48c-7.59 0-15.18 0-22.77-.01h-.5v-.5c-.02-4.92-.02-9.85 0-14.77v-.5h.5c17.95-.01 35.92-.02 53.87 0h.5v.5c.01 4.92.01 9.85 0 14.77v.5h-.5c-10.36 0-20.73.01-31.1.01"
                {...getPathProps(`path-24`)}
              />
              <path
                d="M1468.88 129.5c-6.1 0-11.87-.03-17.4-.09h-.5v-.51c.06-4.49.06-9.28 0-14.65v-.5h.5c10.65-.11 22.3-.11 35.63-.01h.5v.5c-.05 5.37-.05 10.17 0 14.67v.5h-.5c-6.42.05-12.46.08-18.23.08Z"
                {...getPathProps(`path-25`)}
              />
              <path
                d="M1510.5 129.49c-4.93 0-9.86 0-14.78-.01h-.5v-.5c-.02-3.51-.02-7.02-.01-10.52v-4.74h.5c10.08-.04 20.18-.03 29.59 0h.5v15.78h-15.29Z"
                {...getPathProps(`path-26`)}
              />
              <path
                d="M0 156.96v-37.99h113v5.67c.02 10.43.03 21.21 0 31.81v.5H84.17c-27.88 0-55.76 0-83.66.01z"
                {...getPathProps(`path-27`)}
              />
              <path
                d="M520.97 163.23v-.5c-.04-6.6-.03-13.2-.02-19.8v-3.87h9.52c18.48 0 36.96-.02 55.44.01h.51v.51c-.03 2.13-.01 4.27 0 6.4.02 3.48.05 7.09-.11 10.63v.22l-.18.14c-.62.51-1.24 1.04-1.87 1.58-2.02 1.74-4.1 3.53-6.49 4.61l-.21.04c-9.91.02-19.82.02-29.74.01h-26.84Z"
                {...getPathProps(`path-28`)}
              />
              <path
                d="M545.46 394.74c-2.87 0-5.71-.69-7.98-2.75-26.24-33.4-57.81-47.24-93.38-60.67l-.33-.12v-.35c.11-4.46.07-9.01.03-13.41-.05-6.53-.11-13.28.28-19.91l.03-.44.44-.03c25.88-1.75 44.65-9.72 57.38-24.36 21.28-24.48 21.06-64.76 19.04-92.92l-.04-.53h.54c10.44-.02 20.88-.01 31.32-.01h30.94c7.24-5.29 14.41-11 21.34-16.52 4.27-3.4 8.68-6.91 13.07-10.3l-.39-.39 1.11-.07c6.94-.37 13.89-.23 19.77-.04h.24l.14.2c24.72 33.59 49.94 67.68 74.32 100.65 22.16 29.96 45.07 60.93 67.54 91.44l.58.79h-.98c-26.38.11-53.2.09-79.14.08-22.93-.01-46.64-.03-69.96.04-13.26 1.04-37.65 5.54-51.54 23.98-6.75 10.14-14.58 20.11-26.01 24.21-2.44.73-5.42 1.45-8.36 1.45Z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M545.46 394.74c-2.87 0-5.71-.69-7.98-2.75-26.24-33.4-57.81-47.24-93.38-60.67l-.33-.12v-.35c.11-4.46.07-9.01.03-13.41-.05-6.53-.11-13.28.28-19.91l.03-.44.44-.03c25.88-1.75 44.65-9.72 57.38-24.36 21.28-24.48 21.06-64.76 19.04-92.92l-.04-.53h.54c10.44-.02 20.88-.01 31.32-.01h30.94c7.24-5.29 14.41-11 21.34-16.52 4.27-3.4 8.68-6.91 13.07-10.3l-.39-.39 1.11-.07c6.94-.37 13.89-.23 19.77-.04h.24l.14.2c24.72 33.59 49.94 67.68 74.32 100.65 22.16 29.96 45.07 60.93 67.54 91.44l.58.79h-.98c-26.38.11-53.2.09-79.14.08-22.93-.01-46.64-.03-69.96.04-13.26 1.04-37.65 5.54-51.54 23.98-6.75 10.14-14.58 20.11-26.01 24.21-2.44.73-5.42 1.45-8.36 1.45Z"
                {...getPathProps(`path-29`)}
              />
              <path
                d="M789.91 291.17c-8.13 0-16.33-.02-24.45-.12h-.25l-.15-.2c-18.19-24.05-36.52-48.65-54.25-72.44-16.03-21.51-32.6-43.75-49.03-65.53h-.26v-2l.76 1c33.94-.21 68.45-.18 101.83-.14 20.21.02 41.1.04 61.64 0h.5v.5c.01 46.13.02 92.27 0 138.41v.5h-.5c-7.5-.02-14.99 0-22.49 0-4.4 0-8.86.01-13.34.01Z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M789.91 291.17c-8.13 0-16.33-.02-24.45-.12h-.25l-.15-.2c-18.19-24.05-36.52-48.65-54.25-72.44-16.03-21.51-32.6-43.75-49.03-65.53h-.26v-2l.76 1c33.94-.21 68.45-.18 101.83-.14 20.21.02 41.1.04 61.64 0h.5v.5c.01 46.13.02 92.27 0 138.41v.5h-.5c-7.5-.02-14.99 0-22.49 0-4.4 0-8.86.01-13.34.01Z"
                {...getPathProps(`path-30`)}
              />
              <path
                d="M13.34 197.12H0v-30.59h26.34v.5c.04 6.82.03 13.64.02 20.46v9.62h-.5c-4.17.01-8.34.01-12.52.01"
                {...getPathProps(`path-31`)}
              />
              <path
                d="M62.51 197.12H37v-4.85c-.01-8.42-.02-16.83 0-25.24v-.5h27.62c15.96 0 31.92 0 47.88.02h.5v11.24c0 6.28 0 12.56-.02 18.84v.5H62.5Z"
                {...getPathProps(`path-32`)}
              />
              <path
                d="M1049.8 259.44c-28.89 0-57.77 0-86.65-.01h-.53l.03-.53c.28-4.83.16-9.94.03-15.36-.42-17.67-.9-37.7 14.09-49.27l.35-.27.04.04c13.12-7.92 29.03-7.67 43.07-7.45h149.46v18.02c0 18.1 0 36.21-.01 54.31v.5h-3.75c-38.7 0-77.42.01-116.13.01Z"
                {...getPathProps(`path-33`)}
              />
              <path
                d="M1282.02 308.44c-33.52 0-45.5-13.02-57.1-25.65-9.56-10.4-18.59-20.22-38.86-23.42l-.42-.07v-.43c-.02-23.85 0-47.71 0-71.56l-.67-.7h1.16c14.07-.02 28.16-.02 42.25-.02h.5v.5c.01 16.91 0 33.81 0 50.72v37.54c27.29 0 54.61 0 81.91.01h.51v.51c-.05 2.53-.02 5.12 0 7.62.04 4.34.08 8.82-.21 13.23l-.04.57-.56-.12c-6.75-1.41-14.22 1.98-17.75 8.07-.19.27-.33.58-.48.9-.46.97-1.04 2.16-2.56 2.08q-4.02.21-7.68.21Z"
                {...getPathProps(`path-34`)}
              />
              <path
                d="M1277.65 260.52c-10.79 0-21.58 0-32.37-.01h-.5v-73.88h.5c18.65-.03 37.3-.02 55.96-.02h10.06v18.73c0 18.23 0 36.45-.01 54.68v.5h-33.63Z"
                {...getPathProps(`path-35`)}
              />
              <path
                d="M1394.71 223.54c-22.69 0-45.38 0-68.07-.02h-.5v-36.91h.5c53.18-.02 106.37-.02 159.55 0h.5v.5c0 11.97.02 23.94 0 35.92v.5h-91.97Z"
                {...getPathProps(`path-36`)}
              />
              <path
                d="M1513.26 223.53c-4.44 0-8.88 0-13.32-.01h-.5v-.5c-.02-11.97-.02-23.94 0-35.92v-.5h8.51c7.89 0 15.78 0 23.67.01h.5v1.59c0 11.61.02 23.21 0 34.82v.5h-1.02c-5.95 0-11.9.01-17.84.01"
                {...getPathProps(`path-37`)}
              />
              <path
                d="M1556.13 223.54h-16.53v-.5c-.02-8.55-.02-17.1-.01-25.65v-10.76h.5c6.81-.03 13.61-.03 20.42-.02h11.76v.5c.03 11.97.02 23.94.01 35.91v.5h-.5c-5.22.02-10.44.02-15.65.02"
                {...getPathProps(`path-38`)}
              />
              <path
                d="M1624.77 223.54h-46.09v-.5c0-11.97 0-23.93.01-35.91v-.5h1.82c27.38 0 54.76-.02 82.15 0h.5v36.9h-.5c-12.63.02-25.27.02-37.9.02Z"
                {...getPathProps(`path-39`)}
              />
              <path
                d="M1738.18 223.03V203C1738 195 1731 186 1721 186H1670.63V223.03H1738.18Z"
                {...getPathProps(`path-40`)}
              />
              <path
                d="M218.76 243.6v-.5c-.03-14.42-.02-28.83-.02-43.26v-7.95h3.94c5.9-.01 11.8-.02 17.69 0h.5v51.7h-.5c-4.01.01-8.01 0-12.02 0h-9.58Z"
                {...getPathProps(`path-41`)}
              />
              <path
                d="M64.39 243.6H0v-37.98h25.8c12.7 0 25.4 0 38.1.01h.5v13.77c0 7.9 0 15.8-.02 23.7v.5Z"
                {...getPathProps(`path-42`)}
              />
              <path
                d="M94.25 243.61c-6.24 0-12.48 0-18.72-.01h-.5v-9.63c0-9.28 0-18.56.01-27.84v-.5h.5c7.07-.01 14.13 0 21.19 0h16.26v.5c.03 10.51.02 21.03.01 31.55v5.93H94.25"
                {...getPathProps(`path-43`)}
              />
              <path
                d="M137.88 243.61c-5.64 0-11.27 0-16.91-.02h-.5v-13.87c0-7.87 0-15.74.02-23.6v-.5h34.78v.5c.02 8.79.02 17.57.01 26.37v11.1h-.5c-5.64.01-11.27.02-16.91.02Z"
                {...getPathProps(`path-44`)}
              />
              <path
                d="M179.09 243.6c-5.64 0-11.27 0-16.9-.01h-.5v-.5c-.02-12.12-.01-24.25 0-36.37v-1.09h.5c11.26-.02 22.53-.02 33.79 0h.5v.5c.02 9.28.01 18.56.01 27.83v9.62h-.5c-5.63.01-11.27.02-16.9.02"
                {...getPathProps(`path-45`)}
              />
              <path
                d="M1821.42 450.73h-10.89c-10.14 0-18.39-8.26-18.39-18.4V209.87h32.96c16.3 0 32.6 0 48.89.01h.5v240.86h-53.07Z"
                {...getPathProps(`path-46`)}
              />
              <path
                d="M872.08 330.27c-4.12 0-8.23-.01-12.28-.03-5.96-.02-12.11-.04-18.17-.02h-.5v-109.3h.5v-.49c5.41 0 10.81 0 16.22-.02 10.92-.03 22.21-.05 33.32.09h.49v.5c.11 22.91.65 46.19 1.17 68.71.3 13.06.61 26.57.84 39.86v.5l-.49.01c-7.01.16-14.09.2-21.1.2Z"
                {...getPathProps(`path-47`)}
              />
              <path
                d="M1534.65 309.18c-3.9 0-7.78-.02-11.61-.05-5.5-.03-11.2-.07-16.79-.03h-.47l-.03-.47c-.46-7.03-3.84-13.53-9.5-18.32-5.8-4.9-13.29-7.28-20.54-6.54h-64.51c-7.32-.75-14.81 1.64-20.61 6.54-5.67 4.79-9.04 11.29-9.51 18.32l-.03.47h-.47c-11.96.04-23.93.04-35.89.03h-18.52v-.5q-.03-38.565 0-77.13h.49v-.5h.5c27.87.02 55.73 0 83.6-.01 51.01-.03 103.75-.06 155.62.12h.58l-1.51 9.47c-3.55 22.22-7.22 45.19-10.55 67.84l-.06.41-.42.02c-6.56.26-13.2.33-19.79.33Z"
                {...getPathProps(`path-48`)}
              />
              <path
                d="m1738.12 403.16-.85-.85c-54.27-54.16-97.98-77.35-173.42-44.85l-.83.36.14-.9c2.73-17.34 5.43-34.68 8.13-52.02 3.75-24.1 7.64-49.01 11.53-73.51l.07-.42h.43c22.86.01 45.71.01 68.57 0 28.61 0 57.21 0 85.81.02h.5v.5c-.02 21.92 0 43.84 0 65.76.02 34.32.03 69.8-.07 104.7v1.2Z"
                {...getPathProps(`path-49`)}
              />
              <path
                d="M32.49 310.19c-10.65 0-21.27-.02-31.69-.03H0v-52.75h.5c10.18.02 20.37 0 30.55-.01 18.51-.02 37.64-.05 56.46.12l2.75.03-2.58.94c-19.66 7.19-28.21 24.38-25.42 51.1l.06.55h-.55c-9.72.04-19.52.05-29.28.05"
                {...getPathProps(`path-50`)}
              />
              <path
                d="M1074.75 461.1c-.73 0-1.5-.08-2.33-.25-11.65-2.3-30.76-20.25-34.49-27.44-16.21-22.08-46.89-23.94-74.76-22.84l-.52.02v-.52c-.02-33.82-.01-67.64-.01-101.46v-35.36h.5c41.28-.02 82.55-.01 123.83-.01h82.7v.5c.03 21.22.03 42.45.02 63.68 0 21.08 0 42.16.02 63.23v.37l-.35.11c-34.77 10.68-65.95 30.89-90.16 58.46-1.18 1-2.67 1.5-4.45 1.5Z"
                {...getPathProps(`path-51`)}
              />
              <path
                d="M1185.66 397.91v-.52c-.07-35.25-.05-71.1-.03-105.77v-17.84l-1.15-1.16 1.78.46c17.58 4.65 27.07 14.1 36.26 23.25 12.16 12.11 23.72 23.62 52.8 23.62 3.16 0 6.52-.14 10.12-.42 3.99-.74 6.05 1.95 8.25 4.8 3.15 4.08 6.72 8.71 16.99 7.24l.57-.08v.57c.1 12.95.08 26.11.07 38.84 0 7.85-.02 15.69 0 23.54v.5h-.5c-46.04.2-86.81 1.16-124.63 2.95l-.52.02Z"
                {...getPathProps(`path-52`)}
              />
              <path
                d="M1410.2 330.38c-5 0-10.02-2.28-13.69-6.34-4.03-4.44-5.7-10.32-4.46-15.7 1.21-6.76 6.51-12.53 13.2-14.34l1.81-.49-.39.39c14.85-1 30.05-.8 44.76-.6 9.02.12 18.36.24 27.49.08 12.1.95 17.28 10.52 17 19.01-.28 8.48-6.09 17.68-18.18 17.84-21.83.02-43.66 0-65.48.02-.68.09-1.37.13-2.06.13Z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M1410.2 330.38c-5 0-10.02-2.28-13.69-6.34-4.03-4.44-5.7-10.32-4.46-15.7 1.21-6.76 6.51-12.53 13.2-14.34l1.81-.49-.39.39c14.85-1 30.05-.8 44.76-.6 9.02.12 18.36.24 27.49.08 12.1.95 17.28 10.52 17 19.01-.28 8.48-6.09 17.68-18.18 17.84-21.83.02-43.66 0-65.48.02-.68.09-1.37.13-2.06.13"
                {...getPathProps(`path-53`)}
              />
              <path
                d="M150.1 330.25c-11.82 0-23.64 0-35.46-.01h-.51l.01-.51c.04-1.84.02-3.72-.01-5.54-.05-3.43-.1-6.97.3-10.46 1.39-9.57 10.31-17.24 19.98-17.24h9.61c18.03-.01 36.07-.02 54.1 0h.5v33.73h-.5c-16 0-32 .01-48 .01Z"
                {...getPathProps(`path-54`)}
              />
              <path
                d="M293.24 330.26h-79.76v-.5c-.02-10.92-.01-21.83 0-32.75v-.5h.5c40.31-.02 80.62-.01 120.94-.01h40.15v.5c.02 8.16.01 16.31.01 24.46v8.79h-.5c-27.11.01-54.22.01-81.33.01Z"
                {...getPathProps(`path-55`)}
              />
              <path
                d="M415.42 330.26h-31.83v-.5c-.02-6.54-.01-13.08-.01-19.62v-13.63h.5c17.42-.02 33.33-.02 48.61 0h.5v33.73h-.5c-5.76.01-11.52.01-17.28.01Z"
                {...getPathProps(`path-56`)}
              />
              <path
                d="m826.05 372.68-.87-1.17c-3.73-4.99-7.47-9.98-11.21-14.97-12.96-17.3-26.36-35.19-39.39-52.89l-.58-.79h.99c10.92-.04 21.83-.03 32.74-.02h18.54v.5c-.04 8.27-.01 16.68.01 24.82.04 14.12.08 28.72-.19 43.07l-.03 1.46Z"
                fill="url(#diagonalHatch)"
              />

              <path
                d="m826.05 372.68-.87-1.17c-3.73-4.99-7.47-9.98-11.21-14.97-12.96-17.3-26.36-35.19-39.39-52.89l-.58-.79h.99c10.92-.04 21.83-.03 32.74-.02h18.54v.5c-.04 8.27-.01 16.68.01 24.82.04 14.12.08 28.72-.19 43.07l-.03 1.46Z"
                {...getPathProps(`path-57`)}
              />
              <path
                d="M1406.23 399.07c-24.5 0-49.21-1.63-73.66-3.25l-6.18-.41v-.46c-.37-16.14-.31-32.57-.26-48.46.03-8.95.06-18.2.02-27.3v-.21l.29-.29h.22c6.55 0 13.09 0 19.64-.02 11.48-.02 23.35-.04 35.03.11h.4l.09.39c2.58 11.49 13.38 20.35 25.13 20.61 24.18.07 48.71.07 72.91 0 11.81-.24 22.61-9.1 25.12-20.61l.08-.39h.4c10.38-.15 20.92-.12 31.11-.09 5.05.01 10.09.03 15.14.02h.52l-.02.52c-.35 10.39-2.19 20.85-3.96 30.96-.95 5.39-1.93 10.97-2.67 16.45l-.03.24-.21.12c-42.94 25.66-90.6 32.07-139.11 32.07"
                {...getPathProps(`path-58`)}
              />
              <path
                d="M27.86 354.56c-9.12 0-18.23 0-27.35-.02H0V320.8h64.39v.5c.02 10.92.01 21.84 0 32.76v.5H27.85Z"
                {...getPathProps(`path-59`)}
              />
              <path
                d="m200.72 385.78-.54-.04c-13.17-1.05-26.55-2.3-39.49-3.5-14.95-1.39-30.42-2.84-45.64-3.98l-.42-.03-.04-.41c-.76-7.14-.62-14.54-.48-21.7.08-4.5.17-9.14.04-13.67l-.02-.52h.52c11.14.16 22.51.07 33.5-.01 16.53-.12 33.62-.25 50.33.41l.48.02v.48c.04 6.67.47 13.45.88 20.01.46 7.34.94 14.93.87 22.42v.54Z"
                {...getPathProps(`path-60`)}
              />
              <path
                d="m367.06 482.83-.88-.18c-23.12-4.81-46.53-10.4-69.16-15.81-25.36-6.06-51.57-12.32-77.5-17.51l-.38-.08-.02-.39c-.62-11.26-1.38-22.73-2.12-33.81-1.59-23.78-3.23-48.38-3.51-72.59h.47v-.51h10.35c29.83-.02 60.67-.04 91.02.01h.34l.12.32c12.27 32.11 24.09 65.04 35.53 96.88 5.04 14.04 10.26 28.56 15.44 42.82l.31.84Z"
                {...getPathProps(`path-61`)}
              />
              <path
                d="m427.74 407.79-.79-.64c-11.71-9.43-23.86-18.77-35.6-27.79-14.88-11.44-30.26-23.26-44.92-35.4l-1.08-.89h1.4c30.16.15 56.9 1.53 81.74 4.21l.46.05v.46c-.14 6.56-.26 13.12-.38 19.68-.24 12.89-.49 26.22-.8 39.31l-.02 1.01Z"
                {...getPathProps(`path-62`)}
              />
              <path
                d="m895.96 465.71-.91-1.14c-11.26-14-22.17-28.83-32.71-43.16-6.81-9.25-13.84-18.82-20.9-28.07l-.1-.13v-.16c-.28-9.52-.23-19.22-.2-28.6.02-5.83.05-11.85 0-17.77h.49v-.5c20.11-.04 36.57-.04 51.78 0h.49v.49c.69 39.19 1.38 78.38 2.03 117.58l.02 1.46Z"
                {...getPathProps(`path-63`)}
              />
              <path
                d="M452.38 421.47c-3 0-5.76-.45-7.82-.91l-.37-.08-.02-.38c-.59-13.62-.48-27.54-.37-41 .07-9.05.15-18.41 0-27.59v-.61l.59.11c16.98 3.12 34.15 11.64 52.49 26.03l.37.29-.27.39c-8.6 12.37-18.75 26.59-30.45 38.76-4.11 3.89-9.43 5-14.16 5Z"
                {...getPathProps(`path-64`)}
              />
              <path
                d="M633.9 425.24c-27.22 0-54.3-2.38-77.49-17.26l-.16-.1-.42-1.44.52-.12c14.7-3.33 21.85-12.24 29.43-21.68 9.07-11.3 18.45-22.98 41.53-26.19l.09-.02c8.22-1.86 16.72-1.78 24.94-1.71 3.2.03 6.52.06 9.76-.03h.35l.13.32c2.91 7.52 6.05 15.16 9.08 22.56 6 14.64 12.21 29.78 17.09 44.87l.22.69-.73-.04c-11.38-.6-23.4-.35-35.03-.11-6.41.13-12.87.27-19.31.27Z"
                fill="url(#diagonalHatch)"
              />

              <path
                d="M633.9 425.24c-27.22 0-54.3-2.38-77.49-17.26l-.16-.1-.42-1.44.52-.12c14.7-3.33 21.85-12.24 29.43-21.68 9.07-11.3 18.45-22.98 41.53-26.19l.09-.02c8.22-1.86 16.72-1.78 24.94-1.71 3.2.03 6.52.06 9.76-.03h.35l.13.32c2.91 7.52 6.05 15.16 9.08 22.56 6 14.64 12.21 29.78 17.09 44.87l.22.69-.73-.04c-11.38-.6-23.4-.35-35.03-.11-6.41.13-12.87.27-19.31.27Z"
                {...getPathProps(`path-65`)}
              />
              <path
                d="M718.34 424.36c-3.72 0-7.6-.04-11.68-.11h-.34l-.12-.32c-3.89-10.13-7.96-20.38-11.9-30.3-4.7-11.84-9.57-24.09-14.15-36.21l-.26-.68h.72c12.13 0 24.27 0 36.4-.02 23.87-.02 48.55-.05 72.82.08h.25l.15.21c3.06 4.21 6.32 8.47 9.48 12.59 6.26 8.16 12.73 16.61 18.08 25.32l.26.42-.42.26c-37.99 23.71-58.4 28.75-99.3 28.75Z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M718.34 424.36c-3.72 0-7.6-.04-11.68-.11h-.34l-.12-.32c-3.89-10.13-7.96-20.38-11.9-30.3-4.7-11.84-9.57-24.09-14.15-36.21l-.26-.68h.72c12.13 0 24.27 0 36.4-.02 23.87-.02 48.55-.05 72.82.08h.25l.15.21c3.06 4.21 6.32 8.47 9.48 12.59 6.26 8.16 12.73 16.61 18.08 25.32l.26.42-.42.26c-37.99 23.71-58.4 28.75-99.3 28.75Z"
                {...getPathProps(`path-66`)}
              />
              <path
                d="M1635.69 640.92h-52.83c-27.99 0-55.97-.01-83.96 0h-.5v-.5c-.03-66.95-.02-133.89-.01-200.83v-35.93l.29-.14c37.64-17.7 71.12-30.69 102.35-39.71 53.68-19.21 98.65 21.99 136.58 62.11l.13.14.04 2.86c.27 21.7.57 46.3 19.21 61.26l.25.2-.08.31c-7.63 30.55-14.7 61.79-21.53 92-4.29 18.96-8.72 38.57-13.25 57.81l-.09.39h-.4c-28.62.03-57.54.04-86.21.04Z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M1635.69 640.92h-52.83c-27.99 0-55.97-.01-83.96 0h-.5v-.5c-.03-66.95-.02-133.89-.01-200.83v-35.93l.29-.14c37.64-17.7 71.12-30.69 102.35-39.71 53.68-19.21 98.65 21.99 136.58 62.11l.13.14.04 2.86c.27 21.7.57 46.3 19.21 61.26l.25.2-.08.31c-7.63 30.55-14.7 61.79-21.53 92-4.29 18.96-8.72 38.57-13.25 57.81l-.09.39h-.4c-28.62.03-57.54.04-86.21.04Z"
                {...getPathProps(`path-67`)}
              />

              <path
                d="m373.01 449.65-.12-.33q-4.11-11.01-8.25-22.02c-8.23-21.94-16.74-44.62-24.68-67.02l-.55-1.56 1.32.99c17.1 12.84 34.23 26.26 50.79 39.25 11.71 9.18 23.82 18.68 35.82 27.88l.17.13.02.21c.5 4.51.43 9.2.35 13.73-.04 2.7-.09 5.48-.01 8.19v.51h-.5c-10.29.02-20.58.02-30.88.02h-23.51Z"
                {...getPathProps(`path-68`)}
              />
              <path
                d="M42.13 411.64c-5.33 0-10.7-.03-16.02-.16h-.21l-.14-.16c-8.4-8.85-15.33-19.07-22.03-28.96L.1 377.02l-.09-.13v-11.72H64.4v.5c.02 11.39.01 22.79.01 34.2v11.72h-.5c-4.2-.01-8.4 0-12.6.02-3.03.01-6.1.02-9.18.02Z"
                {...getPathProps(`path-69`)}
              />
              <path
                d="M590.63 587.03h-.5c-34.16 0-68.31 0-102.48-.01h-.5v-.5c-.02-34.2-.01-68.4-.01-102.6v-34.26c-14.61 0-29.25 0-43.87-.01h-.5v-.5c-.02-2.89-.01-5.78-.01-8.67v-3.5l.56.07c24.54 3.07 46.19-12.66 66.17-48.11l.1-.18 1.15-.33.21.22c22.48 23.48 47.11 46.55 79.2 48.23l.47.02v.47c.02 49.72.02 99.43 0 149.15v.5Z"
                {...getPathProps(`path-70`)}
              />
              <path
                d="M204.52 446.48H165.7c-17.02 0-34.05 0-51.07-.02h-.5v-53.05l.55.05c9.16.84 18.49 1.63 27.52 2.39 19.57 1.66 39.8 3.37 59.57 5.71l.43.05v.43c.24 7.52.72 15.16 1.18 22.55.44 7 .89 14.24 1.13 21.37l.02.52Z"
                {...getPathProps(`path-71`)}
              />
              <path
                d="M33.93 630.67c-10.28 0-21.13-3.41-33.66-10.26l-.26-.14V398.26l.92 1.45c17.62 27.63 38.09 48.51 60.83 62.05l.24.14v.28c.51 34.77.41 70.17.3 104.4-.05 18-.11 36.6-.08 54.89v.28l-.24.15c-9.48 5.84-18.53 8.78-28.07 8.78Z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M33.93 630.67c-10.28 0-21.13-3.41-33.66-10.26l-.26-.14V398.26l.92 1.45c17.62 27.63 38.09 48.51 60.83 62.05l.24.14v.28c.51 34.77.41 70.17.3 104.4-.05 18-.11 36.6-.08 54.89v.28l-.24.15c-9.48 5.84-18.53 8.78-28.07 8.78Z"
                {...getPathProps(`path-72`)}
              />
              <path
                d="M1401.14 450.22v-.55c.12-6.97.52-14.04.91-20.87.24-4.28.49-8.71.67-13.07v-.19l.29-.3h.23c27.56.48 55.22-4.36 78.63-9.18l.61-.12v.62c-.07 6.54-.07 13.19-.07 19.62 0 5.49 0 10.98-.04 16.47v.46l-.46.04c-11.36.93-22.9 2.01-34.07 3.05-15.12 1.42-30.76 2.88-46.14 3.98l-.54.04Z"
                {...getPathProps(`path-73`)}
              />
              <path
                d="m1246.18 541.5-.54-1.35.07-.19c6.61-16.77 12.64-34.36 18.48-51.37 9.22-26.87 18.75-54.65 30.82-80.05l.12-.25.27-.03c19.38-2.31 38.82.37 57.62 2.97 11.41 1.58 23.2 3.21 34.86 3.7l.46.02.02.46c.86 18.65-.63 37.9-2.08 56.52-.95 12.22-1.93 24.85-2.24 37.17v.39l-.39.09c-46.41 10.56-93.15 21.51-137.06 31.82l-.42.1Z"
                {...getPathProps(`path-74`)}
              />
              <path
                d="m897.05 512.47-.77-.49a85469 85469 0 0 1-119.18-76.4l-.17-.11-.33-1.32.43-.15c12.27-4.26 25.28-9.19 37.26-16.37l.76-.45v.02c3.16-1.88 6.22-4.02 9.19-6.08 1.43-.99 2.86-1.99 4.3-2.96l.36-.24.29.32c11.55 12.77 23.18 25.86 34.42 38.52 10.86 12.22 22.08 24.86 33.23 37.19l.12.14v.18c.17 6.33.14 12.76.11 18.98-.01 2.77-.03 5.54-.02 8.3v.91Z"
                {...getPathProps(`path-75`)}
              />
              <path
                d="m1186.8 472.25-.03-1.02c-.09-3.44-.19-6.89-.29-10.34-.45-15.44-.91-31.4-.55-47v-.45l.45-.04c27.87-2.54 53.23-3.78 77.56-3.79h1.38l-1.06.88c-14.31 11.95-29.26 23.66-43.72 34.99-10.86 8.5-22.08 17.3-32.95 26.13z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="m1186.8 472.25-.03-1.02c-.09-3.44-.19-6.89-.29-10.34-.45-15.44-.91-31.4-.55-47v-.45l.45-.04c27.87-2.54 53.23-3.78 77.56-3.79h1.38l-1.06.88c-14.31 11.95-29.26 23.66-43.72 34.99-10.86 8.5-22.08 17.3-32.95 26.13z"
                {...getPathProps(`path-76`)}
              />
              <path
                d="M1162.85 484.5c-14.54 0-24.38-13.44-33.21-25.5-3.48-4.76-6.78-9.25-10.23-12.87-1.12-.63-1.23-1.5-1.11-2.12 1.23-6.65 35.64-21.81 39.23-22.26 2.32-.8 4.72-1.42 7.05-2.03 1.75-.46 3.56-.93 5.32-1.47l.63-.19.02.66c.34 14.04.29 28.33.23 42.15-.03 7.22-.06 14.68-.03 22.02v.38l-.36.11c-2.64.78-5.15 1.14-7.52 1.14Z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M1162.85 484.5c-14.54 0-24.38-13.44-33.21-25.5-3.48-4.76-6.78-9.25-10.23-12.87-1.12-.63-1.23-1.5-1.11-2.12 1.23-6.65 35.64-21.81 39.23-22.26 2.32-.8 4.72-1.42 7.05-2.03 1.75-.46 3.56-.93 5.32-1.47l.63-.19.02.66c.34 14.04.29 28.33.23 42.15-.03 7.22-.06 14.68-.03 22.02v.38l-.36.11c-2.64.78-5.15 1.14-7.52 1.14Z"
                {...getPathProps(`path-77`)}
              />
              <path
                d="m63.34 449.14-.76-.47c-13.06-8.04-23.62-17.37-31.38-27.72l-.6-.8h1c8.95-.04 18.07-.03 26.88-.02h4.87v8.75c0 6.45.01 12.91-.02 19.36v.89Z"
                {...getPathProps(`path-78`)}
              />
              <path
                d="M995.88 487.6c-8.93 0-17.89-.37-26.77-.74-2-.08-4-.17-5.98-.24l-.48-.02v-61.98h.5v-.49h.45c46.4 0 55.15 10.45 66.22 23.67 6.58 7.85 14.03 16.75 30.76 25.2l.37.19-.4 1.41-.19.1c-20 10.58-42.13 12.91-64.48 12.92Z"
                {...getPathProps(`path-79`)}
              />
              <path
                d="M1217.02 512.04c-4.14 0-8.26-.02-12.34-.04-6.09-.03-12.39-.06-18.57-.02h-.51v-.5c.02-2.51 0-5.02 0-7.54-.02-4.39-.04-8.94.1-13.4v-.24l.2-.14c9.87-7.6 19.85-15.4 29.51-22.95 6.48-5.06 12.95-10.12 19.44-15.16s.43-.35.43-.35c4.34-3.3 8.69-6.74 12.9-10.07 6.92-5.47 14.08-11.13 21.37-16.31l1.28-.91-.52 1.48c-5.32 15.25-11.07 30.65-16.63 45.54-4.89 13.09-9.95 26.63-14.69 40.02l-.11.32h-.34c-7.14.22-14.37.28-21.53.28Z"
                {...getPathProps(`path-80`)}
              />
              <path
                d="M786.61 587.03c-19.7 0-39.39 0-59.08-.01h-.5v-.5c-.02-36.83-.01-73.66-.01-110.49v-37.21l-.86-.86 1.41.15c2.79.31 6.42.13 10.27-.06 7.23-.36 14.71-.73 18.8 1.91 17.39 11.46 34.79 22.9 52.19 34.34 19.13 12.58 38.26 25.15 57.37 37.75l.22.15v.27c.03 24.39.02 48.79.01 73.18v1.37h-.5c-26.44 0-52.88.01-79.32.01"
                {...getPathProps(`path-81`)}
              />
              <path
                d="M687.38 587.04c-7.76 0-15.51 0-23.27-.01h-.5v-.5c-.01-22.42 0-44.83 0-67.24v-49.53c-2.36-.02-4.81-.02-7.45 0v117.27h-.5c-9 .01-17.99 0-26.98 0h-21.05v-.5c-.03-41.82-.02-83.63-.02-125.45v-21.92h.5c33.8 0 67.62-.02 101.42 0h.5v24.39c.01 41 .02 81.99 0 122.98v.5h-22.65Z"
                {...getPathProps(`path-82`)}
              />
              <path
                d="M1074.25 640.93c-14.28 0-28.98-.01-43.66-.04h-.5v-.5c.06-17.73.01-35.78-.03-53.23-.07-28.54-.15-58.05.23-87.03v-.44l.44-.05c14.71-1.87 27.3-6.3 37.43-13.18 11.77-8.06 23.28-18.11 37.31-32.56l.45-.46.34.55c15.07 24.64 34.31 49.32 62.88 45.43l.57-.08v.58c-.01 1.5-.01 3-.01 4.5 0 2.08 0 4.17-.02 6.26v.49h-.5c-6.69.07-13.49.05-20.07.04-6.98-.01-14.2-.03-21.3.05-.16 24.11-.14 48.62-.11 72.33.02 18.62.04 37.87-.03 56.81v.5h-.5c-16.29.02-34.25.04-52.91.04Z"
                {...getPathProps(`path-83`)}
              />
              <path
                d="m1398.3 507.32-.02-.48c-.51-10.52.38-21.33 1.24-31.79.27-3.23.53-6.46.76-9.67l.03-.46h.46c11.44-.91 23.07-2.01 34.32-3.07 15.33-1.44 31.19-2.94 46.8-3.99l.54-.04v.54c-.09 6.53-.06 13.17-.03 19.6.05 9.46.1 19.25-.23 28.86l-.02.49h-.49c-28.4-.2-56.29-.2-82.88 0h-.48Z"
                {...getPathProps(`path-84`)}
              />
              <path
                d="M166.69 490.86c-16.87 0-33.74 0-50.61-.01h-1.95v-11.51c0-5.48 0-10.97.01-16.46v-.5h90.79v.5c.03 5.8.02 11.61.02 17.42v10.54h-.5c-12.59 0-25.18.01-37.76.01Z"
                {...getPathProps(`path-85`)}
              />
              <path
                d="m249.63 493.77-.48-.09c-7.84-1.47-15.77-3.23-23.43-4.93l-4.77-1.05-.02-.38c-.12-2.32-.22-4.63-.33-6.95-.21-4.53-.42-9.2-.72-13.81l-.05.02v-.74l.49-.02-.17-.44.92-.35.15.03c4.56 1.05 9.12 2.09 13.68 3.13 6.54 1.49 13.08 2.98 19.61 4.49l.44.1-.06.45c-.52 3.9-1.7 7.76-2.84 11.5-.85 2.8-1.74 5.69-2.34 8.57l-.1.48Z"
                {...getPathProps(`path-86`)}
              />
              <path
                d="m427.91 496.91-.61-.14c-13.11-2.98-26.97-6.36-41.19-10.03l-.23-.06-.1-.21c-2.63-5.49-4.76-11.48-6.81-17.27l-1.29-3.63h.71c9.37-.01 18.74-.01 28.1 0h21.41v.5c.03 6.46.03 12.91.02 19.37v11.48Z"
                {...getPathProps(`path-87`)}
              />
              <path
                d="M458.45 587.06c-4.84 0-9.66-.06-14.4-.12h-1.07v-.51c.07-38.37.11-79.5-.01-120.25v-.49l.49-.01c9.33-.19 18.8-.19 28.14 0h.49v.5c-.12 39.87-.12 80.3 0 120.18v.49l-.48.02c-4.36.15-8.77.2-13.16.2Z"
                {...getPathProps(`path-88`)}
              />
              <path
                d="M372.63 535.19c-26.07 0-44.23-9.11-64.59-19.32-12.92-6.48-26.27-13.17-43.14-18.42l-.46-.14.64-2.28c1.65-5.86 3.36-11.91 5.11-17.85l.13-.44.45.09c33.62 6.99 67.85 15.4 100.94 23.53l1.69.41.11.15c4.99 6.99 10.01 13.95 15.02 20.92l7.94 11.05-.78.14c-8.39 1.49-16.01 2.15-23.06 2.15Z"
                {...getPathProps(`path-89`)}
              />
              <path
                d="M135.28 535.25c-5.62 0-11.21 0-16.71-.02h-4.44v-36.41h.5v-.49c10.36.04 20.9.02 31.09-.01 17.55-.05 35.7-.1 53.54.22l1.46.03-1.17.87c-6.12 4.56-12.31 9.26-18.3 13.8-9.55 7.25-19.43 14.75-29.3 21.88l-.13.09h-.16c-5.44.03-10.92.04-16.38.04"
                {...getPathProps(`path-90`)}
              />
              <path
                d="M964.39 514.13c-19.43 0-38.86 0-58.29-.01h-.5v-.5c-.02-4.58-.02-9.14 0-13.72v-.5h.5q57.585-.03 115.17 0h.5v4.01c0 3.41 0 6.81-.01 10.22v.5h-57.37"
                {...getPathProps(`path-91`)}
              />
              <path
                d="M171.97 587.03c-19.11 0-38.22 0-57.32-.01h-.5v-13.16c0-9.51-.02-19.03.02-28.55v-.5h15.08c7.94.01 16.15.02 24.22-.03 11.25-9 23.06-17.69 34.49-26.1 7.21-5.31 14.66-10.79 21.91-16.3l-3.6-.76h6.25l-.31.24c4.09.87 8.18 1.77 12.26 2.67 5.8 1.28 11.8 2.6 17.71 3.82l.44.09-.04.45c-.85 9.09-3.47 18.37-6 27.35-4.6 16.31-9.36 33.18-4.1 50.13l.2.65h-60.7Z"
                {...getPathProps(`path-92`)}
              />
              <path
                d="m1846.62 875.33-.48-.12c-23.62-5.85-47.66-11.65-70.92-17.27-26.47-6.39-53.84-13-80.7-19.7l-.48-.12.12-.48c14.89-61.79 29.92-124.64 44.45-185.42 11.72-49.01 23.83-99.69 35.81-149.52l.04-.15.34-.32.34.08 2.11.84c5.96 2.38 12.12 4.85 18.55 5.73 13.07.01 26.15.01 39.23.01h39.49l-.02 251.6c-5.29 20.37-10.2 41.21-14.95 61.37-4.1 17.39-8.33 35.37-12.8 52.98l-.12.48Z"
                {...getPathProps(`path-93`)}
              />
              <path
                d="m427.9 547.32-.87-1c-7.32-8.37-14.34-17.44-21.12-26.22-3.47-4.49-7.06-9.14-10.64-13.62l.41-.37.08-.42c7.78 1.42 15.61 3.35 23.19 5.21 2.86.7 5.73 1.41 8.59 2.09l.39.09v34.25Z"
                {...getPathProps(`path-94`)}
              />
              <path
                d="M328.16 587.03c-26 0-52.17-.01-78.1-.06h-.37l-.11-.36c-5.36-18.27-.16-36.39 4.86-53.92l.62-2.15c.71-2.4 1.28-4.9 1.83-7.33.79-3.47 1.6-7.06 2.84-10.4l.17-.46.47.17c19.56 7.09 33.36 14.17 45.54 20.41 27.47 14.08 45.61 23.38 99.93 15.4l.29-.04.18.23c3.53 4.58 7.08 9.15 10.63 13.73 3.53 4.55 7.06 9.1 10.58 13.66l.08.16c.67 2.22.58 4.59.49 6.88-.05 1.18-.09 2.39-.03 3.55l.03.53h-43.06c-18.74.02-37.76.03-56.87.03Z"
                {...getPathProps(`path-95`)}
              />
              <path
                d="M882.2 587.02c-2.96 0-5.91 0-8.87-.02h-.5v-66.47h.5c4.49-.03 8.97-.03 13.46-.03h4.99v.5c.02 16.44.01 32.89.01 49.33V587h-9.6Z"
                {...getPathProps(`path-96`)}
              />
              <path
                d="M955.18 587.02H898.2v-9.66c0-18.78-.02-37.57.01-56.34v-.5h14.32c14.05 0 28.1 0 42.15.01h.5v.5c.01 21.83.02 43.66 0 65.5v.5Z"
                {...getPathProps(`path-97`)}
              />
              <path
                d="M1021.75 587.02h-59.08v-.5c-.03-13.91-.02-27.82-.02-41.74v-24.26h.5c19.37-.02 38.74-.02 58.12 0h.5v24.26c0 13.91 0 27.83-.02 41.74z"
                {...getPathProps(`path-98`)}
              />
              <path
                d="M1440.22 550.22h-43.24v-.5c-.06-8.8-.04-17.8 0-25.54v-.5h21.88c21.04 0 42.08 0 63.12.01h.5v7.79c0 6.07 0 12.15-.01 18.23v.5h-.5c-13.91.01-27.82.02-41.73.02Z"
                {...getPathProps(`path-99`)}
              />
              <path
                d="M1149.2 640.92h-5.85v-.5c-.02-22.82-.01-45.64-.01-68.46v-46.14h.5c6.73-.04 13.58-.03 20.21-.02h5.64v15.17c0 32.59.02 66.29-.01 99.45v.5h-20.47Z"
                {...getPathProps(`path-100`)}
              />
              <path
                d="M1185.61 554.87v-28.01h.5c15.05-.02 30.09-.01 45.14 0h1.44l-.24.67c-1.22 3.38-2.58 6.77-3.89 10.06-1.02 2.56-2.08 5.2-3.07 7.82l-.09.25-.25.06c-13.78 3.45-26.22 6.51-38.93 9.04l-.6.12Z"
                {...getPathProps(`path-101`)}
              />
              <path
                d="m1355.17 553.12-.14-.43c-1.16-3.52-2.18-7.15-3.17-10.65-.71-2.52-1.44-5.12-2.22-7.67h-4.28l4.54-.99c3.79-.82 7.64-1.73 11.37-2.6 6.84-1.61 13.91-3.27 20.93-4.51l.63-.11-.04.64c-.24 3.45-.38 6.98-.51 10.39-.12 3.25-.25 6.6-.47 9.9l-.03.38-.38.07c-8.56 1.65-17.24 3.49-25.78 5.48z"
                {...getPathProps(`path-102`)}
              />
              <path
                d="M1238.37 591.9c-6.41 0-13.31-.59-20.86-1.91l-.72-.12.38-.63c3.72-6.15 8.11-12.06 12.36-17.78 2.6-3.51 5.3-7.14 7.8-10.77l.09-.13.15-.05c15.81-5.58 33.13-9.25 49.88-12.8 11.05-2.34 22.47-4.76 33.34-7.71l.63-.17v.06c1.57-.31 3.17-.73 4.72-1.13 2.92-.76 5.94-1.55 8.94-1.67l.42-.02.09.41c.6 2.69 1.43 5.39 2.23 8 1.07 3.48 2.17 7.07 2.77 10.72l.07.43-.42.13c-15.65 4.73-28.31 10.96-40.54 16.98-19.5 9.6-36.9 18.17-61.32 18.17Z"
                {...getPathProps(`path-103`)}
              />
              <path
                d="M1458.52 591.95c-4.23 0-8.45-.19-12.52-.9l-.12-.02-.09-.07c-6.04-4.41-12.11-8.99-17.98-13.42-8.21-6.2-16.69-12.61-25.23-18.62l-1.15-.81 1.41-.1c15.86-1.08 32.31-.86 48.21-.66 10.16.13 20.66.27 30.89.07h.52v.51c-.05 4.07-.02 8.22.02 12.23.06 6.98.13 14.21-.29 21.29l-.03.51-.51-.04c-4.99-.4-10.19-.25-15.23-.11-2.61.08-5.25.15-7.89.15Z"
                {...getPathProps(`path-104`)}
              />
              <path
                d="M1433.79 640.21c-15.39 0-30.72-.01-45.79-.03l-16.85-.02.17-.63c4.5-16.46-.03-32.56-4.4-48.13-2.22-7.93-4.53-16.12-5.62-24.28l-.07-.49.49-.07c5.2-.79 10.43-1.97 15.48-3.11 4.5-1.02 9.16-2.07 13.79-2.85l.2-.03.17.12c9.03 6.34 18.03 13.07 26.74 19.58 9.15 6.84 18.6 13.91 28.11 20.54 6.96.03 13.92.02 20.88.02h15.37v.5c.03 12.78.02 25.54 0 38.32v.5h-.5c-16 .05-32.13.07-48.18.07Z"
                {...getPathProps(`path-105`)}
              />
              <path
                d="m1185.63 603.42-.02-6.91c-.02-8.06-.04-16.4.05-24.59v-.4l.4-.08c4.04-.83 8.13-1.82 12.09-2.77 5.71-1.38 11.61-2.8 17.5-3.79l1.29-.22-.82 1.02c-3.05 3.8-6.12 7.71-9.08 11.48-6.61 8.41-13.44 17.1-20.54 25.25l-.87 1Z"
                {...getPathProps(`path-106`)}
              />
              <path
                d="M1277.3 640.31c-23.04 0-45.96-.03-68.53-.05l-22.2-.03.03-.53c.07-1.12.02-2.29-.02-3.42-.08-2.06-.17-4.18.42-6.18l.08-.16c2.31-2.97 4.63-5.93 6.95-8.89 4.3-5.48 8.74-11.14 13.03-16.78l.18-.24.3.05c40.76 6.56 74.33.53 99.78-17.9l.79-.57v.19c12.21-5.96 24.74-10.8 36.55-15.26l.54-.2.13.56c1.24 5.4 2.87 10.96 4.44 16.33 5.01 17.13 10.18 34.85 4.98 52.59l-.1.36h-.37c-25.55.11-51.33.14-76.98.14Z"
                {...getPathProps(`path-107`)}
              />
              <path
                d="M132.41 751.9c-2.4 0-4.8-.02-7.16-.03-3.82-.03-7.77-.05-11.65 0h-.51v-2.9c0-49.56-.02-99.12 0-148.69v-.5h148.99v.5c0 3.11 0 6.23.01 9.34.02 7.66.03 15.58-.05 23.36v.47l-.47.03c-61.06 3.54-113.12 56.34-116.06 117.71l-.02.46-.45.02c-4.19.19-8.43.24-12.62.24Z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M132.41 751.9c-2.4 0-4.8-.02-7.16-.03-3.82-.03-7.77-.05-11.65 0h-.51v-2.9c0-49.56-.02-99.12 0-148.69v-.5h148.99v.5c0 3.11 0 6.23.01 9.34.02 7.66.03 15.58-.05 23.36v.47l-.47.03c-61.06 3.54-113.12 56.34-116.06 117.71l-.02.46-.45.02c-4.19.19-8.43.24-12.62.24Z"
                {...getPathProps(`path-108`)}
              />
              <path
                d="M408.64 751.89c-4.22 0-8.48-.05-12.7-.24l-.46-.02-.02-.46c-2.92-61.38-55-114.19-116.1-117.71l-.47-.03v-.47c-.02-10.35-.03-21.48 0-32.69v-.5h.5v.5-.5c49.1-.03 98.89-.03 147.99 0h.5v152.08h-.51c-3.89-.05-7.85-.02-11.68 0-2.33.02-4.7.03-7.07.03Z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M408.64 751.89c-4.22 0-8.48-.05-12.7-.24l-.46-.02-.02-.46c-2.92-61.38-55-114.19-116.1-117.71l-.47-.03v-.47c-.02-10.35-.03-21.48 0-32.69v-.5h.5v.5-.5c49.1-.03 98.89-.03 147.99 0h.5v152.08h-.51c-3.89-.05-7.85-.02-11.68 0-2.33.02-4.7.03-7.07.03Z"
                {...getPathProps(`path-109`)}
              />
              <path
                d="M668.8 832.17H441.7v-.5c-.02-77.14-.02-154.28 0-231.4v-.5h.5v.5-.5c18.66 0 37.32-.02 55.99 0h.5v46.69c0 20.36 0 40.72.02 61.08h18.98v.5c.03 16.93.03 33.86.02 50.8v27.94c30.05.02 60.1.01 90.15.01h60.93v.5c.03 14.72.03 29.66 0 44.38v.5Z"
                {...getPathProps(`path-110`)}
              />
              <path
                d="M580.27 691.63c-22.07 0-44.14 0-66.21-.02h-.5v-91.83h.5c32.89-.03 65.79-.02 98.68-.02h56.08v.5c.02 30.3.02 60.58 0 90.87v.5h-88.55"
                {...getPathProps(`path-111`)}
              />
              <path
                d="M798.65 669.45H686.88v-.5c-.03-22.79-.03-45.9 0-68.68v-.5h42.23c41.73 0 83.47 0 125.2.01h.5v69.68h-56.14Z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M798.65 669.45H686.88v-.5c-.03-22.79-.03-45.9 0-68.68v-.5h42.23c41.73 0 83.47 0 125.2.01h.5v69.68h-56.14Z"
                {...getPathProps(`path-112`)}
              />
              <path
                d="M909.25 663.11c-15.18 0-30.36 0-45.43-.02h-.5v-63.31h.5c18.17-.02 36.34-.01 54.51-.01h36.84v.5c.03 13.12.02 26.24.02 39.36v23.46h-.5c-15.08.02-30.26.02-45.44.02"
                {...getPathProps(`path-113`)}
              />
              <path
                d="M980.26 920.93h-17.62V792.99c0-64.24 0-128.48.01-192.72v-.5h34.78v.5c.03 67.99.02 135.99.02 203.99v116.66h-.5c-5.57.02-11.13.02-16.7.02Z"
                {...getPathProps(`path-114`)}
              />
              <path
                d="m63.31 648.31-.54-.05c-4.86-.41-9.81-.72-14.59-1.03-4.91-.31-9.98-.64-14.97-1.06l-.46-.04v-.47c.02-.76.03-2.29.03-3.06v-.5h.5c.76 0 1.54.02 2.31.04 1.92.06 3.9.13 5.73-.32 2.9-1.4 5.83-2.88 8.66-4.32 4.11-2.09 8.37-4.25 12.64-6.18l.7-.32v.77c.05 6.07.05 11.15 0 15.99v.54Z"
                {...getPathProps(`path-115`)}
              />
              <path
                d="m24.23 693.38-.58-.1c-3.36-.57-6.73-1.45-9.99-2.3-4.31-1.13-8.77-2.29-13.22-2.73l-.45-.04v-53.69l.64.02c3.03.81 6.07 1.58 9.11 2.35 4.99 1.27 10.14 2.57 15.17 4.04l.37.11v.38c-.13 6.96-.29 13.92-.46 20.88-.24 10-.48 20.34-.59 30.51v.59Z"
                {...getPathProps(`path-116`)}
              />
              <path
                d="M268.44 868.52c-3.27 0-6.6-.11-9.97-.34-29.53-3.77-54.07-17.1-71-38.55-15.18-19.23-23.43-44.12-23.24-70.09.19-25.95 8.8-50.7 24.24-69.68 17.22-21.18 41.94-34.14 71.47-37.48h.03c44.68-2.37 80.44 15.08 100.69 49.13 21.25 35.74 20.92 83.55-.84 118.99-19.15 31.2-51.36 48.03-91.38 48.03Z"
                {...getPathProps(`path-117`)}
              />
              <path
                d="m63.36 700.69-.57-.09c-6.13-.92-12.32-2.27-18.31-3.57-3.7-.81-7.52-1.64-11.28-2.36l-.4-.08v-.41c-.04-13.1-.08-26.65.02-39.98v-.5h.55c4.91.43 9.92.75 14.76 1.05s9.85.62 14.76 1.05l.46.04v.46c.02 7.32.01 14.65.01 21.97v22.41Z"
                {...getPathProps(`path-118`)}
              />
              <path
                d="M1075.44 743.42c-19.11 0-38.22 0-57.33-.01h-.5v-.5c-.03-28.52-.03-57.05-.01-85.57v-.5h3.52c32.1 0 64.2-.02 96.3 0h.5v86.57h-.5c-13.99 0-27.98.01-41.97.01Z"
                {...getPathProps(`path-119`)}
              />
              <path
                d="M1092.38 877.62h-74.77v-.5c-.03-12.28-.02-24.55 0-36.82v-6.99h.5c21.41-.02 42.81-.01 64.22-.01h41.97c.03-34.31.02-68.62.02-102.94v-73.52h.5c11.27-.02 22.53-.01 33.79-.01h12.13v.5c.03 46.68.02 93.36.02 140.04v80.24h-.5c-25.96.01-51.92.01-77.88.01"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M1092.38 877.62h-74.77v-.5c-.03-12.28-.02-24.55 0-36.82v-6.99h.5c21.41-.02 42.81-.01 64.22-.01h41.97c.03-34.31.02-68.62.02-102.94v-73.52h.5c11.27-.02 22.53-.01 33.79-.01h12.13v.5c.03 46.68.02 93.36.02 140.04v80.24h-.5c-25.96.01-51.92.01-77.88.01"
                {...getPathProps(`path-120`)}
              />
              <path
                d="m1240.49 757.81-.64-.19c-11.36-3.34-22.85-6.96-33.97-10.47-6.27-1.98-12.55-3.95-18.83-5.89l-.35-.11v-.37c-.06-20.11-.05-40.56-.04-60.33v-23.13h.5v-.49c13.1-.01 26.2-.01 39.29-.01h14.01v.5c.03 21.28.02 42.57.02 63.85v36.64Z"
                {...getPathProps(`path-121`)}
              />
              <path
                d="M1268 706.44c-5.46 0-10.91 0-16.37-.02h-.5v-.5c0-16.2-.02-32.4 0-48.6v-.5h12.38c6.95 0 13.91 0 20.87.02h.5v49.58h-.5c-5.46 0-10.92.02-16.38.02"
                {...getPathProps(`path-122`)}
              />
              <path
                d="M1302.97 736.01c-2.68 0-5.36 0-8.04-.01h-.5v-79.16h.5c4.07-.04 8.15-.03 12.23-.03h7.28v.5c.01 19.54.01 39.1.01 58.64v20.04h-.5c-3.67 0-7.33.01-10.99.01Z"
                {...getPathProps(`path-123`)}
              />
              <path
                d="m1353.5 793.32-.66-.22c-2.75-.92-5.45-1.8-8.18-2.49l-.37-.09v-.38c-.26-11.01-.22-22.19-.18-33.01.02-6.92.05-14.06 0-21.1h-18.99v-.5c-.03-22.35-.02-44.69-.02-67.03v-11.66h5.3c7.56 0 15.11-.02 22.67 0h.5v.5c-.01 16.22 0 32.44 0 48.66.01 28.39.02 57.75-.06 86.63v.69Z"
                {...getPathProps(`path-124`)}
              />
              <path
                d="M1465.66 800.47c-4.09 0-8.17 0-12.26-.02h-.48l-.02-.48c-1.96-47.94-36.35-92.81-81.77-106.68l-.34-.1-.02-.35c-.37-7.52-.31-15.19-.26-22.6.03-4.23.06-8.6.02-12.89v-.51h3.84c35.86 0 71.73-.02 107.59 0h.5v43.43c.01 33.24.02 66.47 0 99.71v.5h-16.8Z"
                {...getPathProps(`path-125`)}
              />
              <path
                d="M1535.89 714.88h-38.55v-.5c-.03-15.7-.02-31.4 0-47.1v-10.45h.51c18.87-.02 37.73-.01 56.6-.01h19.95v.5c.03 12.17.02 24.33.02 36.49v21.06h-.5c-12.67 0-25.35.01-38.02.01Z"
                {...getPathProps(`path-126`)}
              />
              <path
                d="M1656.3 714.88c-22.18 0-44.35 0-66.53-.01h-.5v-.5c0-19.03-.02-38.03 0-57.05v-.5h129.28l-.13.6c-2.84 13.37-5.97 26.92-9 40.02-1.31 5.68-2.62 11.36-3.92 17.04l-.09.39h-.4c-16.24 0-32.48.01-48.71.01"
                {...getPathProps(`path-127`)}
              />
              <path
                d="M954.12 776.18h-90.79v-.5c-.02-20.04-.02-40.08-.01-60.13v-40.74h.5c8.07-.03 16.15-.02 24.23-.02h14.3v.5c.02 10.18.01 20.36.01 30.53v30.24c9.43.03 18.85.02 28.28.02h23.49v14.68c0 8.3 0 16.61-.02 24.91v.5Z"
                {...getPathProps(`path-128`)}
              />
              <path
                d="M932.51 728.62h-21.63v-.5c-.02-14.6-.02-29.21 0-43.81v-9.51h.5c15.17-.02 28.99-.02 42.26 0h.5v14c0 13.1 0 26.2-.01 39.3v.5h-.5c-7.04 0-14.08.01-21.12.01Z"
                {...getPathProps(`path-129`)}
              />
              <path
                d="M746.88 751.87c-19.84 0-39.69 0-59.53-.01h-.5v-66.49h21.95c47.69-.01 97-.02 145.5.01h.5v26.76c0 13.08 0 26.16-.01 39.23v.5H746.87Z"
                {...getPathProps(`path-130`)}
              />
              <path
                d="m63.21 720.13-.58-.11c-21-4.11-41.57-8.1-62.21-11.81l-.41-.07v-9.75l.59.11c7.96 1.51 16.06 3.09 23.88 4.62 12.49 2.44 25.41 4.97 38.14 7.26l.33.06.07.32c.51 2.27.4 4.6.28 6.86-.03.64-.06 1.28-.08 1.92l-.02.59Z"
                {...getPathProps(`path-131`)}
              />
              <path
                d="M552.62 779.34c-9 0-18.01 0-26.95-.02h-.5v-18.41c0-17.62 0-35.24.01-52.87v-.5h.5c17.95 0 35.92-.02 53.88 0h.5v71.77h-.5c-8.94.02-17.94.02-26.95.02Z"
                {...getPathProps(`path-132`)}
              />
              <path
                d="M604.15 779.35h-17.67v-.5c-.01-23.61-.02-47.2 0-70.8v-.5h21.08c20.26 0 40.51 0 60.77.02h.5v26.38c0 14.97 0 29.93-.02 44.9v.5h-64.66"
                {...getPathProps(`path-133`)}
              />
              <path
                d="M1410.4 800.5c-5.05 0-10.08-.01-15.04-.02-7.97-.02-16.21-.04-24.32 0h-.5v-25.37c0-21.27-.02-43.26.04-64.9v-.72l.67.25c18.17 6.78 34.07 19.03 45.98 35.42 11.86 16.33 18.65 35.23 19.64 54.66l.03.52h-.52c-8.62.13-17.34.17-25.97.17Z"
                {...getPathProps(`path-134`)}
              />
              <path
                d="M1284.86 736.02h-33.71v-.5c-.03-4.78-.03-9.54-.03-14.32v-4.7h.49v-.5c10.92-.02 21.82 0 32.74 0h.5v.5c.02 6.33.03 12.67 0 19.01v.5Z"
                {...getPathProps(`path-135`)}
              />
              <path
                d="M35.02 898.74c-11.5 0-23 0-34.51-.01H0V720.68l.58.1c7.19 1.19 14.38 2.36 21.57 3.53 12.67 2.07 25.77 4.2 38.65 6.4l.42.07v.42c.02 55.68.01 111.35 0 167.03v.5h-.5c-8.57 0-17.14.01-25.71.01Z"
                {...getPathProps(`path-136`)}
              />
              <path
                d="M1557.24 800.48h-59.89v-.5c-.04-24.06-.03-47.74-.01-69.74v-.5h77.07v17.51c0 17.57 0 35.14-.01 52.72v.5h-17.16Z"
                {...getPathProps(`path-137`)}
              />
              <path
                d="M1646.76 800.49c-7.27 0-14.51-.01-21.65-.02-11.58-.02-23.56-.04-35.33 0h-.5v-17.51c0-17.57 0-35.14.01-52.71h.49v-.5c37.13-.02 74.27 0 111.41-.02h.61l-.12.6c-2.58 12.84-5.6 25.84-8.52 38.41-2.37 10.21-4.82 20.78-7.03 31.19l-.08.39h-.4c-12.91.14-25.96.17-38.88.17Z"
                {...getPathProps(`path-138`)}
              />
              <path
                d="m1284.88 771.62-.63-.18c-7.31-2.04-14.67-4.37-21.79-6.64-3.65-1.16-7.29-2.32-10.94-3.44l-.35-.11v-.36c-.07-3.67-.06-7.39-.05-10.99v-2.77h.5v-.5h7.99c8.25 0 16.5 0 24.75.01h.5v24.97Z"
                {...getPathProps(`path-139`)}
              />
              <path
                d="m1334.52 787.26-.64-.19c-6.51-1.96-13.11-4.03-19.5-6.04s-12.99-4.08-19.5-6.04l-.35-.1v-.36c-.12-5.89-.1-11.87-.08-17.66.01-3.24.02-6.47.01-9.71h.49v-.5c13.02 0 26.05-.02 39.09 0h.5v14.71c0 8.41 0 16.82-.02 25.23v.67Z"
                {...getPathProps(`path-140`)}
              />
              <path
                d="M1044.02 826.9h-26.41v-.5c-.03-14.78-.03-29.57-.02-44.35v-24.81h.5c12.54-.03 25.67-.03 40.15-.01h.5v69.66h-.5c-4.74.01-9.48.01-14.22.01"
                {...getPathProps(`path-141`)}
              />
              <path
                d="M1117.92 826.89h-52.76v-.5c-.02-22.9-.02-45.79 0-68.68v-.5h52.75v.5c.03 21.63.03 44.09.01 68.68z"
                {...getPathProps(`path-142`)}
              />
              <path
                d="M1213.58 877.63c-8.8 0-17.6 0-26.4-.01h-.5v-.5c.04-14.56.02-29.36 0-43.68-.04-24.38-.08-49.59.2-74.38l-1.36-1.36 2.01.67c7.84 2.64 15.93 5.12 23.76 7.52 9.5 2.91 19.32 5.93 28.74 9.23l.33.12v.35c.22 21.69.18 43.75.15 65.1-.02 12.15-.04 24.29 0 36.44v.5h-26.91Z"
                {...getPathProps(`path-143`)}
              />
              <path
                d="M708.26 832.17h-21.4v-.5c-.02-21.49-.01-42.98 0-64.46v-1.04h.5v-.49h38.95c32.07-.01 65.23-.02 97.85.02h1.31l-.98.87c-13.57 12.04-27.64 16.92-41.25 21.65-20.68 7.18-40.21 13.96-58.6 43.67l-.15.24h-.28c-5.3.04-10.67.04-15.97.04Z"
                {...getPathProps(`path-144`)}
              />
              <path
                d="M787.99 832.19c-16.64 0-33.41-.01-50.02-.05h-.93l.52-.78c14.26-21.28 33.75-28.28 52.6-35.04 13.69-4.91 27.85-9.99 40.03-20.51 6.5-7.58 12.55-11.66 24.19-10.13l.44.06v.44c0 21.83 0 43.66-.01 65.49v.5H788Z"
                {...getPathProps(`path-145`)}
              />
              <path
                d="M162.01 921.76c-22.28 0-35-1.56-41.95-8.56-8.94-9.01-8.43-26.57-7.42-61.55.61-21.21 1.38-47.61.43-82.29h.49l.01-.51h.49c3.45.02 6.96 0 10.35-.02 6.75-.04 13.73-.08 20.59.19l.46.02.02.46c2.95 61.39 55.03 114.2 116.11 117.73l.47.03v.47c.05 10.9.03 21.98.01 32.69v.51h-.51c-29.87-.45-53.81.05-73.04.45-10.07.21-18.86.4-26.52.4Z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M162.01 921.76c-22.28 0-35-1.56-41.95-8.56-8.94-9.01-8.43-26.57-7.42-61.55.61-21.21 1.38-47.61.43-82.29h.49l.01-.51h.49c3.45.02 6.96 0 10.35-.02 6.75-.04 13.73-.08 20.59.19l.46.02.02.46c2.95 61.39 55.03 114.2 116.11 117.73l.47.03v.47c.05 10.9.03 21.98.01 32.69v.51h-.51c-29.87-.45-53.81.05-73.04.45-10.07.21-18.86.4-26.52.4Z"
                {...getPathProps(`path-146`)}
              />
              <path
                d="M401.98 811.3c-5.24 0-10.51-.11-15.69-.48l-.7-.05.28-.65c5.61-13.08 8.87-26.78 9.68-40.7l.03-.46h.46c6.88-.18 13.87-.16 20.63-.13 3.58.01 7.16.03 10.75.01h.5v42.33h-.51c-5.07-.08-10.26-.02-15.27.05-3.34.04-6.73.09-10.14.09Z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M401.98 811.3c-5.24 0-10.51-.11-15.69-.48l-.7-.05.28-.65c5.61-13.08 8.87-26.78 9.68-40.7l.03-.46h.46c6.88-.18 13.87-.16 20.63-.13 3.58.01 7.16.03 10.75.01h.5v42.33h-.51c-5.07-.08-10.26-.02-15.27.05-3.34.04-6.73.09-10.14.09Z"
                {...getPathProps(`path-147`)}
              />
              <path
                d="M1259.11 877.61c-2.66 0-5.2 0-7.5-.02h-.5v-.5c.11-12.79.04-25.82-.03-38.43-.11-19.59-.21-39.85.33-59.69l.02-.69.65.24c3.62 1.33 7.39 2.46 11.03 3.55l2.69.81v.37c.13 20.47.11 41.28.09 61.41-.01 10.82-.02 21.63-.01 32.45v.5h-.5c-2.12.02-4.23.02-6.27.02Z"
                {...getPathProps(`path-148`)}
              />
              <path
                d="M1353.53 877.61h-81.28v-.5c-.02-15.2-.02-30.39-.01-45.59 0-15.19.01-30.39 0-45.58v-.5l.64.02c16.02 4.45 32.18 9.59 47.81 14.57 10.63 3.39 21.63 6.89 32.47 10.13l.36.11v.37c.06 16.94.05 34.16.03 50.81v16.17Z"
                {...getPathProps(`path-149`)}
              />
              <path
                d="M916.28 850.13c-17.49 0-34.97 0-52.45-.01h-.5v-.5l-.01-15.39c0-15.65 0-31.3.01-46.94v-.5h91.85v.5c.02 14.92.02 29.84.01 44.77v18.06h-.5c-12.8 0-25.61.01-38.41.01"
                {...getPathProps(`path-150`)}
              />
              <path
                d="M1482.47 865.98h-71.78v-.5c-.02-3.77-.02-7.55-.02-11.32v-4.02c-7.13-.02-14.27-.01-21.4-.01h-18.74v-.5c-.02-8.02-.02-16.05-.01-24.07v-10.22h.5c26.34-.02 52.68-.02 79.03-.01h32.41v2.02c0 16.05.02 32.1 0 48.15v.5Z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M1482.47 865.98h-71.78v-.5c-.02-3.77-.02-7.55-.02-11.32v-4.02c-7.13-.02-14.27-.01-21.4-.01h-18.74v-.5c-.02-8.02-.02-16.05-.01-24.07v-10.22h.5c26.34-.02 52.68-.02 79.03-.01h32.41v2.02c0 16.05.02 32.1 0 48.15v.5Z"
                {...getPathProps(`path-151`)}
              />
              <path
                d="M1530.81 877.61c-11 0-21.99 0-32.98-.02h-.5v-18.12c0-14.55 0-29.09.01-43.65v-.5h19.96c18.87 0 37.74 0 56.61.01h.5v23.08c0 12.9 0 25.8-.02 38.7v.5h-43.58"
                {...getPathProps(`path-152`)}
              />
              <path
                d="M1636.01 877.61h-46.74v-.5c-.02-20.44-.02-40.85 0-61.28h.5v-.49h92.66l-.13.61c-2.49 11.3-5.13 22.76-7.67 33.85-2.06 8.97-4.19 18.25-6.24 27.38l-.09.39h-.4c-10.59.04-21.29.05-31.89.05Z"
                {...getPathProps(`path-153`)}
              />
              <path
                d="M345.09 920.95c-21.9 0-43.88 0-65.68-.04h-.5v-.5c-.01-10.89-.02-21.78 0-32.66v-.47l.47-.03c39.23-2.73 76.43-25.32 97.09-58.94l.15-.24h.25c3.25-.6 6.96-.61 10.45-.02l.14.02.11.09c1.59 1.38 3.22 2.87 4.8 4.3 10.21 9.27 20.76 18.86 34.94 16.75l.57-.09v.58c.03 13.87.03 27.75.02 41.62v29.59h-13.82c-22.7 0-45.8.02-68.99.02Z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M345.09 920.95c-21.9 0-43.88 0-65.68-.04h-.5v-.5c-.01-10.89-.02-21.78 0-32.66v-.47l.47-.03c39.23-2.73 76.43-25.32 97.09-58.94l.15-.24h.25c3.25-.6 6.96-.61 10.45-.02l.14.02.11.09c1.59 1.38 3.22 2.87 4.8 4.3 10.21 9.27 20.76 18.86 34.94 16.75l.57-.09v.58c.03 13.87.03 27.75.02 41.62v29.59h-13.82c-22.7 0-45.8.02-68.99.02Z"
                {...getPathProps(`path-154`)}
              />
              <path
                d="M424.22 840.94c-8.14 0-16.39-4.44-22.6-12.31l-.11-.14v-.66l.49-.02c5.9-.15 11.9-.13 17.7-.1 2.57.01 5.13.02 7.69.02h.5v.5c.02 3.54.03 7.74 0 11.99v.43l-.43.06q-1.62.24-3.24.24Z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M424.22 840.94c-8.14 0-16.39-4.44-22.6-12.31l-.11-.14v-.66l.49-.02c5.9-.15 11.9-.13 17.7-.1 2.57.01 5.13.02 7.69.02h.5v.5c.02 3.54.03 7.74 0 11.99v.43l-.43.06q-1.62.24-3.24.24Z"
                {...getPathProps(`path-155`)}
              />
              <path
                d="m1874.51 882.57-.61-.14c-2-.46-4.01-.89-6.02-1.31-1.78-.38-3.55-.75-5.31-1.15l-.49-.11.12-.49c.96-3.99 1.91-7.99 2.85-11.98 2.66-11.25 5.41-22.88 8.48-34.21l.98-3.63v53.03Z"
                {...getPathProps(`path-156`)}
              />
              <path
                d="M518.61 885.01h-76.9v-.5c-.02-7.4-.02-14.81-.01-22.21v-15.25h.5c34.38-.04 69.32-.02 103.12-.01h15.72v.5c.02 9.2.01 18.41.01 27.61V885h-.5c-13.98.01-27.96.01-41.94.01"
                {...getPathProps(`path-157`)}
              />
              <path
                d="M619.83 885c-12.71 0-25.42 0-38.14-.02h-.5v-9.62c0-9.28 0-18.55.01-27.83v-.5h.5c17.21-.02 34.43-.02 51.64-.01h35.48v.5c.04 10.52.03 21.06.02 31.59V885h-49Z"
                {...getPathProps(`path-158`)}
              />
              <path
                d="M754.4 885h-67.54v-.5c-.02-12.33-.02-24.65 0-36.98v-.5h67.55v.5c.02 13.29.02 25.38 0 36.98v.5Z"
                {...getPathProps(`path-159`)}
              />
              <path
                d="M785.62 920.94c-7.04 0-14.09 0-21.13-.02h-.5v-18.5c0-18.3 0-36.6.01-54.89v-.5h.5c14.09-.02 28.16-.02 42.26 0h.5v73.89h-.5c-7.05.01-14.1.02-21.14.02"
                {...getPathProps(`path-160`)}
              />
              <path
                d="M837.2 920.94h-21.43v-73.88h.5c11.04-.04 22.28-.02 33.14-.01h5.39v.5c.02 14.55.01 29.11.01 43.66v29.72h-.5c-5.7.02-11.4.03-17.11.03Z"
                {...getPathProps(`path-161`)}
              />
              <path
                d="m1822.53 915.66-.6-.15c-26.75-6.9-54-13.74-80.35-20.35-18.63-4.68-37.89-9.51-56.82-14.33l-.42-.11.05-.43c.54-5.08 1.83-10.2 3.08-15.14.85-3.38 1.74-6.87 2.37-10.32l.03-.15.31-.31.28.06c25.53 6.14 51.42 12.7 76.46 19.05 18.14 4.6 36.91 9.35 55.39 13.91l.38.09v.39c0 2.83 0 5.67.02 8.5.04 6.12.08 12.45-.17 18.67l-.02.62Z"
                {...getPathProps(`path-162`)}
              />
              <path
                d="M909.25 920.94c-15.14 0-30.28 0-45.42-.02h-.5v-.5c-.01-20.77-.02-41.55 0-62.32v-.5h.5c22.71-.01 45.43-.01 68.14-.01h23.2v.5c.03 13.12.02 26.25.02 39.37v23.46h-.5c-15.15 0-30.3.02-45.44.02"
                {...getPathProps(`path-163`)}
              />
              <path
                d="M1388.72 890.29c-5.9 0-11.79 0-17.68-.01h-.5v-.5c-.02-7.28-.02-14.55-.01-21.82v-9.29h.5c7.63-.03 15.25-.03 22.88-.02h8.25v.5c.01 7.66.01 15.32.01 22.98v8.15h-.5c-4.32 0-8.64.01-12.96.01Z"
                {...getPathProps(`path-164`)}
              />
              <path
                d="M1419.85 921.99c-16.28 0-32.55 0-48.82-.02h-.5v-9.32c0-4.45 0-8.9.01-13.35v-.5h40.12c.02-3.37.02-6.75.01-10.12 0-3.86 0-7.71.02-11.57v-.5h28.67c14.2 0 28.4 0 42.61.01h.5v18.16c0 8.9 0 17.81-.01 26.71v.5h-62.62Z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M1419.85 921.99c-16.28 0-32.55 0-48.82-.02h-.5v-9.32c0-4.45 0-8.9.01-13.35v-.5h40.12c.02-3.37.02-6.75.01-10.12 0-3.86 0-7.71.02-11.57v-.5h28.67c14.2 0 28.4 0 42.61.01h.5v18.16c0 8.9 0 17.81-.01 26.71v.5h-62.62Z"
                {...getPathProps(`path-165`)}
              />
              <path
                d="M1033.23 921.99c-5.05 0-10.09 0-15.14-.01h-.5v-36.91h.5c6.31-.02 12.63-.02 18.95-.01h7.94v.5c.03 7.63.02 15.25.02 22.88v13.54h-.5c-3.76 0-7.52.01-11.28.01Z"
                {...getPathProps(`path-166`)}
              />
              <path
                d="M1065.44 922c-4.51 0-9.02 0-13.52-.01h-.5v-.5c0-11.97-.02-23.94 0-35.92v-.5h7.02c6.63 0 13.27-.01 19.9.02h.5V922h-13.38Z"
                {...getPathProps(`path-167`)}
              />
              <path
                d="M1170.24 921.99h-85v-.5c-.03-11.92-.03-24.01 0-35.93v-.5h85.49v.5c.03 11.97.02 23.93.01 35.92v.5h-.5Z"
                {...getPathProps(`path-168`)}
              />
              <path
                d="m1240.42 948.17-.91-1.5c-4.44-7.32-12.56-12.65-22.85-15.02l-.38-.09v-.39c-.03-1.71-.02-3.43-.02-5.15v-4.03h-29.57v-.5c-.03-9.88-.02-19.76 0-29.64v-6.28h.51v-.49h6.78c15.09-.01 30.69-.03 46.04 0h.5v.5c-.02 7.97 0 15.94 0 23.91.02 12.1.04 24.6-.06 36.91v1.76Z"
                {...getPathProps(`path-169`)}
              />
              <path
                d="M1307.06 951.58h-55.94v-19.21c0-15.6 0-31.19.01-46.79v-.5h.5c25.56-.02 51.12-.01 76.68-.01h25.24v.5c.02 11.97.02 23.95 0 35.93v.5h-46.48c-.01 4.76-.01 9.53 0 14.29v15.29Z"
                {...getPathProps(`path-170`)}
              />
              <path
                d="m1874.5 946.28-.51-.02c-5.3-.16-10.6-.3-15.89-.45-6.67-.18-13.34-.36-20.02-.57l-.5-.02v-.5c.15-5.98.25-11.96.35-17.94.19-11.37.38-23.13.84-34.68l.02-.48h.6c3.25.74 6.5 1.49 9.75 2.24 8.15 1.89 16.58 3.83 24.94 5.3l.41.07v47.04Z"
                {...getPathProps(`path-171`)}
              />
              <path
                d="M495.45 920.97c-17.51 0-35.31 0-53.24-.02h-.5v-4.09c-.02-7.62-.02-15.23 0-22.85v-.5h.5c37.44-.02 77.71-.03 118.58 0h.5v.5c.05 10.24.05 18.64 0 26.45v.5h-.5c-21.02.01-42.93.02-65.34.02Z"
                {...getPathProps(`path-172`)}
              />
              <path
                d="M665.77 920.95h-84.59v-.5c-.02-5.27-.01-10.54-.01-15.82v-11.08h.5c57.14-.03 115.09-.03 172.24 0h.5v27.39h-.5c-29.38.01-58.76.01-88.14.01"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M665.77 920.95h-84.59v-.5c-.02-5.27-.01-10.54-.01-15.82v-11.08h.5c57.14-.03 115.09-.03 172.24 0h.5v27.39h-.5c-29.38.01-58.76.01-88.14.01"
                {...getPathProps(`path-173`)}
              />
              <path
                d="M1529.98 957.92c-10.72 0-21.43 0-32.15-.01h-.5v-64.38h.5c19.17-.02 38.33-.01 57.5-.01h19.06v.5c.02 21.13.02 42.27 0 63.39v.5h-.5c-14.64 0-29.28.01-43.92.01Z"
                {...getPathProps(`path-174`)}
              />
              <path
                d="M1625.91 957.96c-4.47 0-8.91-.02-13.3-.04-7.48-.03-15.22-.06-22.82 0h-.5v-.5c-.03-13.35-.02-26.69-.02-40.04v-23.35h.49v-.5c24.61-.03 49.56-.03 74.17 0h.62l-.13.61c-2.14 9.81-4.43 19.75-6.64 29.37-2.55 11.05-5.18 22.48-7.59 33.77l-.08.38h-.39c-7.89.23-15.88.29-23.79.29Z"
                {...getPathProps(`path-175`)}
              />
              <path
                d="m1822.7 963.35-23.97-6.05c-40.8-10.31-82.98-20.96-124.5-31.3l-.41-.1.03-.42c.45-5.89 2.04-11.88 3.57-17.68 1.05-3.95 2.13-8.03 2.83-12.03l.07-.41h.54c28.87 6.48 58.14 14.01 86.45 21.3 18.01 4.64 36.63 9.43 54.96 13.9l.38.09v.39c.1 8.01.08 16.16.06 24.04 0 2.55-.01 5.1-.01 7.65v.64Z"
                {...getPathProps(`path-176`)}
              />
              <path
                d="M14.76 987.5H0v-80.25h4.45c3.26 0 6.52-.01 9.78 0h.5v.5c.01 13.21.01 26.42 0 39.62s0 26.41 0 39.62v.5Z"
                {...getPathProps(`path-177`)}
              />
              <path
                d="M121.48 987.51H24.31v-80.24h.5c11.97 0 23.94-.02 35.91 0h.52l-.02.52c-1.21 26.76 3.26 44.01 14.08 54.29 9.71 9.23 24.63 12.73 45.61 10.7l.55-.05v.55c.01 2.63.01 5.25.01 7.88v6.36Z"
                {...getPathProps(`path-178`)}
              />
              <path
                d="M1333.51 951.58h-20.04v-.5c-.02-5.26-.02-10.52-.01-15.79v-6.88h.5c12.31-.03 25.1-.03 39.1 0h.5v23.17h-20.04Z"
                {...getPathProps(`path-179`)}
              />
              <path
                d="M1482.48 987.51h-111.95v-55.94h.5c36.97-.02 73.96-.02 110.94 0h.5v55.94Z"
                {...getPathProps(`path-180`)}
              />
              <path
                d="M1699.8 987.51h-41.02l.14-.61c1.6-6.91 3.23-13.82 4.85-20.72 1.76-7.47 3.52-14.94 5.24-22.41v-.03c.08-1.02.59-1.95 1.33-2.41.42-.27 1.13-.52 2.06-.17 4.39 1.09 8.84 2.22 13.29 3.35 6.98 1.77 14.2 3.61 21.31 5.33l.48.12-.11.48c-3.13 13.48-5.58 25.47-7.5 36.66l-.07.42Z"
                {...getPathProps(`path-181`)}
              />
              <path
                d="M1822.71 987.5h-107.96l.12-.6c.7-3.56 1.38-7.12 2.06-10.69 1.38-7.21 2.81-14.67 4.34-21.97l.08-.4h.53c26 6.09 52.35 12.85 77.83 19.39 7.52 1.93 15.05 3.86 22.57 5.78l.37.09v.38c.05 2.49.06 5 .06 7.51v.5Z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M1822.71 987.5h-107.96l.12-.6c.7-3.56 1.38-7.12 2.06-10.69 1.38-7.21 2.81-14.67 4.34-21.97l.08-.4h.53c26 6.09 52.35 12.85 77.83 19.39 7.52 1.93 15.05 3.86 22.57 5.78l.37.09v.38c.05 2.49.06 5 .06 7.51v.5Z"
                {...getPathProps(`path-182`)}
              />
              <path
                d="M1874.51 987.51h-36.93v-9.92c0-7.78-.01-15.56 0-23.34v-.5h9.48c8.98 0 17.96 0 26.94.01h.5v33.75Z"
                {...getPathProps(`path-183`)}
              />
              <path
                d="M1307.06 987.51h-52.68l-.02-.48c-.47-9.86-3.41-19.64-8.5-28.28l-.44-.75h.87c14.04-.03 28.09-.02 42.13-.02h18.63v.5c.01 5.47 0 10.94 0 16.41v12.61Z"
                {...getPathProps(`path-184`)}
              />
              <path
                d="M1353.56 987.51h-40.1v-29.52h.5c12.34-.02 25.62-.03 39.1 0h.5v29.51Z"
                {...getPathProps(`path-185`)}
              />
              <path
                d="M187 987.51h-49.62v-14.73h.5c16.2 0 32.4-.02 48.6 0h.5v5.98c0 2.75 0 5.5.01 8.25v.5Z"
                {...getPathProps(`path-186`)}
              />
              <path
                d="M270.67 1018.07H195.5v-14.42c0-9.95-.01-20.24.04-30.33v-.5h.5c13.57.09 27.37.07 40.71.05 10.96-.02 22.3-.03 33.45.01h.5v.5c.06 15.74.11 29.94-.03 44.19z"
                {...getPathProps(`path-187`)}
              />
              <path
                d="M291.59 1072.53h-12.62v-39.92c0-19.76 0-39.5.01-59.27v-.49h.49c3.8-.07 7.74-.15 11.64.07l.47.03v.47q.015 28.17 0 56.46v42.66Z"
                {...getPathProps(`path-188`)}
              />
              <path
                d="M355 987.51h-55.95v-4.42c0-3.28-.01-6.55.01-9.82v-.5h14.06c13.79 0 27.58 0 41.38.02h.5v14.72"
                {...getPathProps(`path-189`)}
              />
              <path
                d="M438.48 987.51h-74.97v-5.53c0-2.9 0-5.8.02-8.71v-.5h30.36c14.69 0 29.39 0 44.09.01h.5v.5c.01 2.62 0 5.23 0 7.85v6.38"
                {...getPathProps(`path-190`)}
              />
              <path
                d="M500.83 987.51h-53.85v-6.03c0-2.74 0-5.47.01-8.2v-.5h.5c13.31-.02 26.61-.02 39.92-.01h13.37v.5c.03 2.4.02 4.8.02 7.21 0 2.18 0 4.35.01 6.54v.5Z"
                {...getPathProps(`path-191`)}
              />
              <path
                d="M625.5 1008.2H509.33v-35.4h.5c38.22-.05 76.98-.05 115.19 0h.5v.5c0 11.47 0 22.92-.01 34.39v.5Z"
                {...getPathProps(`path-192`)}
              />
              <path
                d="M805.14 1008.2H632.96v-35.37h.5c49.09-.09 99-.06 147.27-.04h24.4v.51c.01 6.5 0 13.02 0 19.56v15.34Z"
                {...getPathProps(`path-193`)}
              />
              <path
                d="M860.09 987.51h-44.32v-14.73h.5c15.51-.02 29.68-.02 43.32 0h.5v14.72Z"
                {...getPathProps(`path-194`)}
              />
              <path
                d="M958.37 987.51H868.6v-14.72h.5c18.69-.03 37.37-.02 56.05-.02h33.2v.5c.02 2.16.01 4.32 0 6.47 0 2.42 0 4.84.01 7.26v.5Z"
                {...getPathProps(`path-195`)}
              />
              <path
                d="M1029.16 987.51h-51.72v-4.46c0-3.26-.01-6.52 0-9.78v-.5h51.7v.5c.01 2.62.01 5.23 0 7.85v6.39Z"
                {...getPathProps(`path-196`)}
              />
              <path
                d="M1132.72 987.51h-95.06v-4.28c-.01-3.33-.02-6.65.02-9.97v-.49h23.44c23.7 0 47.39 0 71.09.01h.5v5.98c0 2.75 0 5.5.01 8.25z"
                {...getPathProps(`path-197`)}
              />
              <path
                d="M1201.53 987.51h-58.2v-4.46c0-3.26-.01-6.52 0-9.78v-.5h15.8c9.01 0 18.03 0 27.04.02 7.65-.17 14.52 6.22 15.3 14.17l.05.55Z"
                {...getPathProps(`path-198`)}
              />
              <path
                d="M1644.82 987.51h-147.49v-4.15c0-3.01-.01-6.02 0-9.04v-.5h53.22c31.7 0 63.4-.01 95.1.02h.62l-.14.61c-1.02 4.54-1.89 8.24-2.74 11.63l1.4 1.42Z"
                {...getPathProps(`path-199`)}
              />
              <path
                d="M389.85 1072.53h-90.79v-.5c-.02-15.34-.01-30.68-.01-46.02v-31.05h.5c8.05-.02 16.1-.02 24.16-.02h14.37v.5c.02 7.82.01 15.64.01 23.46v22.79c9.44.02 18.89.02 28.34.02h23.44v11.28c0 6.35 0 12.69-.02 19.04z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M389.85 1072.53h-90.79v-.5c-.02-15.34-.01-30.68-.01-46.02v-31.05h.5c8.05-.02 16.1-.02 24.16-.02h14.37v.5c.02 7.82.01 15.64.01 23.46v22.79c9.44.02 18.89.02 28.34.02h23.44v11.28c0 6.35 0 12.69-.02 19.04z"
                {...getPathProps(`path-200`)}
              />
              <path
                d="M153.65 39.13H76.87v-.5c-.02-7.38-.02-14.76-.01-22.14V1.17h.5c33.7-.03 67.39-.02 101.08-.02h17.76v.5c.02 9.2.01 18.41.01 27.61v9.85h-.5c-14.02.01-28.04.01-42.06.01Z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M153.65 39.13H76.87v-.5c-.02-7.38-.02-14.76-.01-22.14V1.17h.5c33.7-.03 67.39-.02 101.08-.02h17.76v.5c.02 9.2.01 18.41.01 27.61v9.85h-.5c-14.02.01-28.04.01-42.06.01Z"
                {...getPathProps(`path-201`)}
              />
              <path
                d="M250.67 39.16c-10.47 0-20.95 0-31.42-.02h-.5V1.19h.5c14.58-.02 29.17-.01 43.75-.01h29.55v.5c.03 10.56.02 21.13.01 31.7v5.78h-41.89"
                {...getPathProps(`path-202`)}
              />
              <path
                d="M364.48 39.16h-67.54v-.5c-.02-12.33-.02-24.65 0-36.98v-.5h67.55v.5c.02 13.26.02 25.35 0 36.98v.5Z"
                {...getPathProps(`path-203`)}
              />
              <path
                d="M395.7 75.09c-7.04 0-14.09 0-21.13-.02h-.5v-18.5c0-18.3 0-36.6.01-54.89v-.5h.5c14.09-.02 28.16-.02 42.26 0h.5v73.89h-.5c-7.05 0-14.1.02-21.14.02"
                {...getPathProps(`path-204`)}
              />
              <path
                d="M447.19 75.09h-21.34V1.2h.5c10.82-.03 21.65-.02 32.48-.02h6.05v.5c.02 14.55.01 29.11.01 43.66v29.72h-.5c-5.73.02-11.47.03-17.2.03"
                {...getPathProps(`path-205`)}
              />
              <path
                d="M130.98 75.1c-17.54 0-35.58 0-53.61-.02h-.5v-4.2c0-7.58-.02-15.16.01-22.74v-.5h.5c35.07-.02 76.58-.03 118.58 0h.5v.5c.05 10.2.04 18.6 0 26.45v.5h-.5c-20 .01-42.05.02-64.97.02Z"
                {...getPathProps(`path-206`)}
              />
              <path
                d="M292.44 75.1h-73.69v-.5c-.02-5.28-.01-10.56 0-15.84V47.7h.5c48.02-.03 96.73-.03 144.76 0h.5v27.4h-.5c-23.85 0-47.7.01-71.55.01Z"
                {...getPathProps(`path-207`)}
              />
              <path
                d="M747.22 1072.53H632.98v-.5c-.03-17.7-.03-35.65 0-53.35v-.5H804.6v13.67c0 13.39 0 26.78-.01 40.17v.5h-57.38Z"
                {...getPathProps(`path-208`)}
              />
              <path
                d="M814.42 41.8c-5.9 0-11.79 0-17.68-.02h-.5v-.5c-.02-9.67-.02-19.34-.01-29V.26h.5c7.66-.04 15.45-.03 22.98-.03h8.16v.5c.02 10.1.01 20.21.01 30.3v10.75h-.5c-4.32.01-8.64.02-12.96.02"
                {...getPathProps(`path-209`)}
              />
              <path
                d="M844.58 73.5c-15.95 0-31.9 0-47.84-.02h-.5v-9.39c0-4.43 0-8.86.01-13.28v-.5h40.12c.02-3.38.02-6.76.01-10.14 0-3.85 0-7.7.02-11.56v-.5h28.88c14.13 0 28.27 0 42.4.01h.5v18.29c0 8.86 0 17.72-.01 26.58v.5h-63.6Z"
                {...getPathProps(`path-210`)}
              />
              <path
                d="M564.25 75.07c-14.26 0-28.53 0-42.79-.01h-.5V73.4c0-23.91-.02-47.81 0-71.72v-.5h86.57v.5c.02 23.9.01 47.8 0 71.71v1.66h-.5c-14.26 0-28.52.01-42.79.01Z"
                {...getPathProps(`path-211`)}
              />
              <path
                d="M662.7 75.07h-41.34v-.5c-.03-12.63-.03-25.76-.01-40.15v-.5h69.66v.5c.02 8.02.02 16.03.01 24.05v16.59h-.5c-9.28.02-18.55.03-27.83.03Z"
                {...getPathProps(`path-212`)}
              />
              <path
                d="M656.18 27.51h-34.84V1.2h.5c22.89-.01 45.79-.02 68.68 0h.5v26.32h-34.84Z"
                {...getPathProps(`path-213`)}
              />
              <path
                d="M752.02 75.07c-15.64 0-31.28 0-46.92-.02h-.5v-.5c-.05-6.28-.04-12.67-.03-18.84v-8.05h.5c17.13-.03 34.26-.02 51.39-.02h29.63v.5c.05 8.74.02 17.63 0 26.22v.7h-34.08Z"
                {...getPathProps(`path-214`)}
              />
              <path
                d="M728.58 41.25h-24.01V30.98c0-9.61-.02-19.55.05-29.33v-.5h35.09c15.3 0 30.6 0 45.91.01h.5v10.27c0 9.77 0 19.53-.03 29.3v.5h-.5c-19 .01-38 .02-57.01.02"
                {...getPathProps(`path-215`)}
              />
              <path
                d="M215.55 1072.53h-31.67v-.5c-.02-14.61-.01-29.21 0-43.82V1027h86.57v1.21c.01 14.61.02 29.22 0 43.83v.5h-54.9Z"
                {...getPathProps(`path-216`)}
              />
              <path
                d="M939.64 1072.53H816.3v-.5c-.02-18.16-.01-36.31-.01-54.46v-18.95h.5c12.3-.01 24.6 0 36.9 0h6.91v.5c.02 10.24.01 20.49.01 30.73v19.9c34.43.01 68.86.01 103.3 0h73.16v.5c.02 5.44.01 10.88.01 16.32v5.95h-97.44Z"
                {...getPathProps(`path-217`)}
              />
              <path
                d="M176.54 1072.53h-69.66v-.5c-.02-8.89-.02-17.78-.01-26.67v-18.34h.5c14.64-.04 29.29-.03 43.93-.02h25.23v.5c.03 14.01.03 28.58.01 44.54v.5Z"
                {...getPathProps(`path-218`)}
              />
              <path
                d="M444.09 1072.53h-46.42v-30.93h.5c34.06-.01 68.11-.01 102.16 0h.5v30.92h-.5c-18.74 0-37.49.01-56.24.01"
                {...getPathProps(`path-219`)}
              />
              <path
                d="M23.96 1052.88H.15v-.5c-.02-8.3-.01-16.59 0-24.89v-.5h42.06v.5c.02 5.92.02 11.84.02 17.77v7.59h-.5c-5.92.02-11.85.02-17.77.02Z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M23.96 1052.88H.15v-.5c-.02-8.3-.01-16.59 0-24.89v-.5h42.06v.5c.02 5.92.02 11.84.02 17.77v7.59h-.5c-5.92.02-11.85.02-17.77.02Z"
                {...getPathProps(`path-220`)}
              />
              <path
                d="M15.6 1072.53H.14v-3.18c0-2.68 0-5.36.01-8.04v-.5h42.07v3.18c0 2.68.01 5.37-.02 8.05v.49z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M15.6 1072.53H.14v-3.18c0-2.68 0-5.36.01-8.04v-.5h42.07v3.18c0 2.68.01 5.37-.02 8.05v.49z"
                {...getPathProps(`path-221`)}
              />
              <path
                d="M606 1072.53h-19.52v-54.33h.5c12.67-.02 25.35-.02 38.03 0h.5v54.32h-.5c-6.34.01-12.67.01-19.01.01"
                {...getPathProps(`path-222`)}
              />
              <path
                d="M187 1018.07H0v-23.12h186.99v23.12Z"
                {...getPathProps(`path-223`)}
              />
              <path
                d="M1215.14 73.5H917.5V28.11h297.64z"
                {...getPathProps(`path-224`)}
              />
              <path
                d="M1032.31 21.7H837.59V.22h194.72v21.47Z"
                {...getPathProps(`path-225`)}
              />
              <path
                d="M1107.01 21.51h-66.36V.22h66.36z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M1107.01 21.51h-66.36V.22h66.36z"
                {...getPathProps(`path-226`)}
              />
              <path
                d="M1215.14 21.51h-101.98V.22h101.98z"
                {...getPathProps(`path-227`)}
              />
              <path
                d="M1473.88 1039.26c-5.69 0-11.38 0-17.06-.01h-1.22v-.5c-.02-9.63-.02-19.26-.01-28.88v-12.14h.5c7.66-.04 15.45-.04 22.98-.03h8.16v.5c.01 10.14.01 20.29.01 30.42v10.63h-.5c-4.29.01-8.57.01-12.85.01Z"
                {...getPathProps(`path-228`)}
              />
              <path
                d="M1504.57 1070.96c-16.16 0-32.32 0-48.48-.02h-.5v-8.85c0-4.21 0-8.42.01-12.63v-.5h40.12c.02-3.18.02-6.37.01-9.55 0-3.65 0-7.3.02-10.95v-.5h28.95c14.11 0 28.21 0 42.33.01h.5v17.45c0 8.34 0 16.68-.01 25.03v.5h-62.96Z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M1504.57 1070.96c-16.16 0-32.32 0-48.48-.02h-.5v-8.85c0-4.21 0-8.42.01-12.63v-.5h40.12c.02-3.18.02-6.37.01-9.55 0-3.65 0-7.3.02-10.95v-.5h28.95c14.11 0 28.21 0 42.33.01h.5v17.45c0 8.34 0 16.68-.01 25.03v.5h-62.96Z"
                {...getPathProps(`path-229`)}
              />
              <path
                d="M1158.54 1072.53c-14.14 0-28.29 0-42.43-.01h-.5v-.5h.5-.5c0-24.31-.02-48.61 0-72.91v-.5h85.86v.5c.02 24.3 0 48.59 0 72.89v.5h-.5c-14.14.02-28.29.02-42.43.02Z"
                {...getPathProps(`path-230`)}
              />
              <path
                d="M1322.13 1072.53H1258V1031.38H1350.65V1072.51Z"
                {...getPathProps(`path-231`)}
              />
              <path
                d="M1315.54 1024.97H1257V998.66H1350.38V1024.98Z"
                {...getPathProps(`path-232`)}
              />
              <path
                d="M1411.61 1072.53c-15.72 0-31.43 0-47.15-.02h-.5v-.5c-.05-6.28-.04-12.67-.03-18.84v-8.05h.5c17.1-.03 34.19-.02 51.29-.02h29.72v.5c.05 8.81.03 17.76 0 26.41v.5l-.5.01h-33.34Z"
                {...getPathProps(`path-233`)}
              />
              <path
                d="M1388.03 1038.71h-24.09v-10.32c-.01-9.59-.02-19.51.04-29.28v-.5h34.77c15.4 0 30.81 0 46.23.01h.5v10.16c0 9.8 0 19.61-.03 29.41v.5h-.5c-18.97.01-37.95.02-56.93.02Z"
                {...getPathProps(`path-234`)}
              />
              <path
                d="M1874.5 1070.96h-297.64v-42.99h297.64z"
                {...getPathProps(`path-235`)}
              />
              <path
                d="M1691.67 1019.16h-194.72v-21.48h194.72z"
                {...getPathProps(`path-236`)}
              />
              <path
                d="M1766.37 1018.97h-66.36v-21.29h66.36z"
                {...getPathProps(`path-237`)}
              />
              <path
                d="M1874.5 1018.97h-101.98v-21.29h101.98z"
                {...getPathProps(`path-238`)}
              />
              <path
                d="M73.4 1072.53H48.65v-45.55H73.4z"
                {...getPathProps(`path-239`)}
              />
              <path
                d="M101.65 1072.53H80.82v-45.55h20.83z"
                {...getPathProps(`path-240`)}
              />
              <path
                d="M500.83 1034.24H347.37v-39.29h153.46z"
                {...getPathProps(`path-241`)}
              />
              <path
                d="M551.1 1072.53h-41.77v-54.35h41.77z"
                {...getPathProps(`path-242`)}
              />
              <path
                d="M582.31 1072.53h-27.04v-54.35h27.04z"
                {...getPathProps(`path-2M1107.01 21.51h-66.36V.22h66.36z43`)}
              />
              <path
                d="M1107.18 1040.62H869.75V998.6h237.43z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M1107.18 1040.62H869.75V998.6h237.43z"
                {...getPathProps(`path-244`)}
              />
              <path
                d="M1106.67 1072.53h-65.34v-22.56h65.34z"
                {...getPathProps(`path-245`)}
              />
              <path
                d="M1590.24 73.5h-90.79V73c-.02-14.45-.01-28.9-.01-43.36V.24h.5c8.04-.02 16.07-.02 24.11-.02h14.42v.5c.02 7.41.01 14.81 0 22.21v21.4c9.43.02 18.87.02 28.3.01h23.48v10.64c0 6 0 12-.02 18v.5Z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M1590.24 73.5h-90.79V73c-.02-14.45-.01-28.9-.01-43.36V.24h.5c8.04-.02 16.07-.02 24.11-.02h14.42v.5c.02 7.41.01 14.81 0 22.21v21.4c9.43.02 18.87.02 28.3.01h23.48v10.64c0 6 0 12-.02 18v.5Z"
                {...getPathProps(`path-246`)}
              />
              <path
                d="M1493.02 73.5h-86.57V73c-.02-14.39-.01-28.79 0-43.18v-1.85h86.57v.5h-.5.5c0 14.85.02 29.69 0 44.54v.5Z"
                {...getPathProps(`path-247`)}
              />
              <path
                d="M1399.11 73.5h-69.66V73c-.02-8.94-.02-17.87-.01-26.8V27.99h.5c14.71-.04 29.42-.03 44.13-.03h25.03v.5c.03 13.99.03 28.56.01 44.54z"
                {...getPathProps(`path-248`)}
              />
              <path
                d="M1643.13 73.5h-47.06V44.16h.5c34.54-.01 69.06-.01 103.58 0h.5V73.5h-.5c-19 0-38.02.01-57.03.01Z"
                {...getPathProps(`path-249`)}
              />
              <path
                d="M1246.58 55.38h-23.85v-.5c-.02-8.81-.01-17.6 0-26.41v-.5l.5-.01c13.68-.01 27.37-.01 41.06 0h.5v.5c.03 6.28.02 12.56.02 18.84v8.05h-.5c-5.91.02-11.81.02-17.72.02Z"
                {...getPathProps(`path-250`)}
              />
              <path
                d="M1264.77 73.5h-42.05v-3.12c0-2.7 0-5.4.01-8.1v-.5h42.07v3.18c0 2.68.01 5.37-.02 8.05v.49Z"
                {...getPathProps(`path-251`)}
              />
              <path
                d="M1803.9 73.5h-19.5l-.02-.5V19.16h.5c12.67-.02 25.35-.02 38.03 0h.5v54.32h-.5c-6.34.01-12.67.01-19.01.01Z"
                {...getPathProps(`path-252`)}
              />
              <path
                d="M1493.04 21.55h-270.33V.22h270.33z"
                {...getPathProps(`path-253`)}
              />
              <path
                d="M1297.06 73.5h-27.47V27.95h27.47z"
                {...getPathProps(`path-254`)}
              />
              <path
                d="M1324.22 73.5h-21.94V27.95h21.94z"
                {...getPathProps(`path-255`)}
              />
              <path
                d="M1700.66 35.26H1547.2V0h153.46z"
                {...getPathProps(`path-256`)}
              />
              <path
                d="M1748.99 73.5h-41.77V19.15h41.77z"
                {...getPathProps(`path-257`)}
              />
              <path
                d="M1780.2 73.5h-27.04V19.15h27.04z"
                {...getPathProps(`path-258`)}
              />
              <path
                d="M1823.41 12.97h-116.19V.22h116.19v12.74Z"
                {...getPathProps(`path-259`)}
              />
              <path
                d="M1874.5 73.5h-48.15V0h48.15z"
                {...getPathProps(`path-260`)}
              />
              <path
                d="M30.66 75.1c-10.05 0-20.1 0-30.15-.02h-.5V53.5h25.18c.01-3.14.01-6.28 0-9.41 0-3.56 0-7.12.01-10.69v-.5h18.27c8.88 0 17.77 0 26.66.01h.5v42.18H30.65Z"
                fill="url(#diagonalHatch)"
              />
              <path
                d="M30.66 75.1c-10.05 0-20.1 0-30.15-.02h-.5V53.5h25.18c.01-3.14.01-6.28 0-9.41 0-3.56 0-7.12.01-10.69v-.5h18.27c8.88 0 17.77 0 26.66.01h.5v42.18H30.65Z"
                {...getPathProps(`path-261`)}
              />
              <path
                d="M70.65 26.92H25.37V1.15h45.28v25.78Z"
                {...getPathProps(`path-262`)}
              />
              <path
                d="M17.99 44.37H0V1.15h17.98v43.22Z"
                {...getPathProps(`path-263`)}
              />
            </g>
          )}

          {/* base gray pipe */}
          <motion.path
            d="M952 401 952 218.6736Q952 162 1009 161.7552L1735.3472 162.0016Q1792.0192 161.7552 1792.0192 218.4272L1792.0192 429Q1792.0192 485 1848.6912 485L1990 485Q1990 581 1990 625L1990 1090 1255.36 1090 1255.36 1007Q1255.36 951 1198.688 951L169 951Q112 951 112 895L112 332.5104Q112 275.592 169 275.592L460 276Q516 276 516 220L516-9"
            fill="none"
            stroke="#949b9f"
            strokeWidth="20"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={
              startAnim
                ? { pathLength: 1, opacity: 1 }
                : { pathLength: 0, opacity: 0 }
            }
            transition={{ duration: 1.6, ease: 'easeInOut' }}
          />

          {/* blue flowing stroke with gradient and glow */}
          <motion.path
            d="M952 401 952 218.6736Q952 162 1009 161.7552L1735.3472 162.0016Q1792.0192 161.7552 1792.0192 218.4272L1792.0192 429Q1792.0192 485 1848.6912 485L1990 485Q1990 581 1990 625L1990 1090 1255.36 1090 1255.36 1007Q1255.36 951 1198.688 951L169 951Q112 951 112 895L112 332.5104Q112 275.592 169 275.592L460 276Q516 276 516 220L516-9"
            fill="none"
            stroke="url(#flowGradient)"
            strokeWidth="18"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={startAnim ? { pathLength: 1 } : { pathLength: 0 }}
            transition={{ duration: 8, ease: 'linear' }}
          />
        </svg>
      </div>
    </div>
  );
}
