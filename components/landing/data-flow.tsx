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

import { motion, useReducedMotion } from 'framer-motion';

import { MAP_PATHS } from '@/components/landing/data-flow.paths';
import React, { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Delay before the entry animation kicks in, in ms. */
const ANIMATION_START_DELAY_MS = 400;

/** Trailing-path opacity is the configured fillOpacity scaled by this factor. */
const TRAIL_OPACITY_MULTIPLIER = 0.5;

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

/**
 * Animated SVG pipeline used as the landing-page hero background. Renders a
 * static pipe-network SVG with optional Mapbox-tile underlay and per-path
 * hover/click interactions. The component intentionally owns all of its own
 * state (hover trail, animation start) because every path emits via event
 * delegation through a single shared callback set.
 */
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

  // Users who prefer reduced motion see the pipes fully drawn, no path-draw.
  const prefersReducedMotion = useReducedMotion();

  // Animation delay state
  const [startAnim, setStartAnim] = useState(false);

  // Hover state for map paths - now tracks trail of recent hovers
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [trailingPaths, setTrailingPaths] = useState<Set<string>>(new Set());
  const hoverTimeoutRef = React.useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    const timer = setTimeout(
      () => setStartAnim(true),
      ANIMATION_START_DELAY_MS
    );
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
    const trailOpacity = isCurrentHover
      ? fillOpacity
      : fillOpacity * TRAIL_OPACITY_MULTIPLIER;

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
              {/* Map geometry lives in data-flow.paths.ts; see MAP_PATHS. */}
              {MAP_PATHS.map((path, index) =>
                path.decorative ? (
                  <path key={index} d={path.d} fill="url(#diagonalHatch)" />
                ) : (
                  <path
                    key={index}
                    d={path.d}
                    {...getPathProps(`path-${index}`)}
                  />
                )
              )}
            </g>
          )}

          {/* base gray pipe */}
          <motion.path
            d="M952 401 952 218.6736Q952 162 1009 161.7552L1735.3472 162.0016Q1792.0192 161.7552 1792.0192 218.4272L1792.0192 429Q1792.0192 485 1848.6912 485L1990 485Q1990 581 1990 625L1990 1090 1255.36 1090 1255.36 1007Q1255.36 951 1198.688 951L169 951Q112 951 112 895L112 332.5104Q112 275.592 169 275.592L460 276Q516 276 516 220L516-9"
            fill="none"
            stroke="#949b9f"
            strokeWidth="20"
            strokeLinecap="round"
            initial={
              prefersReducedMotion ? false : { pathLength: 0, opacity: 0 }
            }
            animate={
              prefersReducedMotion || startAnim
                ? { pathLength: 1, opacity: 1 }
                : { pathLength: 0, opacity: 0 }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 1.6, ease: 'easeInOut' }
            }
          />

          {/* blue flowing stroke with gradient and glow */}
          <motion.path
            d="M952 401 952 218.6736Q952 162 1009 161.7552L1735.3472 162.0016Q1792.0192 161.7552 1792.0192 218.4272L1792.0192 429Q1792.0192 485 1848.6912 485L1990 485Q1990 581 1990 625L1990 1090 1255.36 1090 1255.36 1007Q1255.36 951 1198.688 951L169 951Q112 951 112 895L112 332.5104Q112 275.592 169 275.592L460 276Q516 276 516 220L516-9"
            fill="none"
            stroke="url(#flowGradient)"
            strokeWidth="18"
            strokeLinecap="round"
            initial={prefersReducedMotion ? false : { pathLength: 0 }}
            animate={
              prefersReducedMotion || startAnim
                ? { pathLength: 1 }
                : { pathLength: 0 }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 8, ease: 'linear' }
            }
          />
        </svg>
      </div>
    </div>
  );
}
