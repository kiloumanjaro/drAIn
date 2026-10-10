'use client';

import { useCallback, useEffect, useState } from 'react';
import { isCompactMap } from '@/lib/layout/compact-map';
import { clampDragPosition, startPosition } from '@/lib/simulation/drag-bounds';

export interface Position {
  x: number;
  y: number;
}

export interface PanelAnchor {
  /** Panel size in pixels, used to offset the anchor to the panel's centre. */
  width: number;
  height: number;
  /** Fraction of the viewport to anchor to. Defaults to centred. */
  anchorX?: number;
  anchorY?: number;
  /** The narrowest the panel gets. */
  minWidth: number;
  /** Its width with everything shown. */
  fullWidth: number;
  /**
   * Set for a panel fixed to the screen. The others are placed inside the
   * map area, which starts to the right of the navigation rail.
   */
  fixed?: boolean;
}

/** A panel's position, and whether it was dragged there or only started there. */
interface Placement {
  position: Position;
  moved: boolean;
}

/** Where the map area starts on screen: the navigation rail's width. */
function mapAreaLeft(): number {
  const mapArea = document.getElementById('main-content');
  return mapArea?.getBoundingClientRect().left ?? 0;
}

/** Places a floating panel relative to the viewport. */
function anchoredPosition({
  anchorX = 0.5,
  anchorY = 0.5,
  fixed,
  ...size
}: PanelAnchor): Position {
  if (typeof window === 'undefined') {
    // Server render: any value works, the panel is repositioned on mount.
    return { x: 400, y: 100 };
  }
  const mapLeft = mapAreaLeft();
  return startPosition({
    ...size,
    anchorX,
    anchorY,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    mapLeft,
    originX: fixed ? 0 : mapLeft,
  });
}

/**
 * A dragged position, pulled back within reach on this screen: the window
 * may be smaller than it was when the panel was left there. Left as it is
 * on the compact map, where panels are pinned and the position is not used:
 * pulled in to fit a phone, it would stay there on a desktop.
 */
function withinReach(position: Position, anchor: PanelAnchor): Position {
  if (typeof window === 'undefined' || isCompactMap()) return position;
  return clampDragPosition(position, {
    // The widest it can be, so this is never stricter than the drag limit.
    width: anchor.fullWidth,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    originX: anchor.fixed ? 0 : mapAreaLeft(),
    originY: 0,
    // As the drag does: a fixed panel stays off the navigation rail.
    leftLimit: anchor.fixed ? mapAreaLeft() : undefined,
  });
}

function readStored(storageKey: string): Position | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return null;
    const { x, y } = JSON.parse(saved) as Partial<Position>;
    // Anything that is not a position counts as nothing stored.
    return typeof x === 'number' &&
      typeof y === 'number' &&
      Number.isFinite(x) &&
      Number.isFinite(y)
      ? { x, y }
      : null;
  } catch (error) {
    console.error(`Failed to read saved position for ${storageKey}`, error);
    return null;
  }
}

/**
 * A floating panel's position. It starts at the stored position if there
 * is one and at the anchor if not, and is kept on screen as the window
 * changes size: a panel nobody has dragged is placed afresh, a dragged one
 * is moved only as far as it takes to keep its header within reach.
 */
function usePlacement(anchor: PanelAnchor, readSaved: () => Position | null) {
  const [placement, setPlacement] = useState<Placement>(() => {
    const saved = readSaved();
    return saved
      ? { position: withinReach(saved, anchor), moved: true }
      : { position: anchoredPosition(anchor), moved: false };
  });

  useEffect(() => {
    const handleResize = () => {
      setPlacement((current) => {
        const position = current.moved
          ? withinReach(current.position, anchor)
          : anchoredPosition(anchor);
        return position.x === current.position.x &&
          position.y === current.position.y
          ? current
          : { ...current, position };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [anchor]);

  /**
   * For the drag: from here on the panel stays where it was put. Not on the
   * compact map, where panels are pinned and there is nowhere to put one.
   */
  const moveTo = useCallback((position: Position) => {
    if (isCompactMap()) return;
    setPlacement({ position, moved: true });
  }, []);

  return [placement, moveTo] as const;
}

/**
 * Position for a draggable panel, remembered across visits.
 *
 * Falls back to the anchor when nothing has been stored yet, or when the
 * stored value cannot be read. Only a position the panel was dragged to is
 * stored: one it merely started at is worked out again on the next visit.
 * Nothing is stored on the compact map, where the panel is pinned.
 */
export function usePersistentPosition(storageKey: string, anchor: PanelAnchor) {
  const [{ position, moved }, moveTo] = usePlacement(anchor, () =>
    readStored(storageKey)
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !moved || isCompactMap()) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(position));
    } catch (error) {
      console.error(`Failed to save position for ${storageKey}`, error);
    }
  }, [storageKey, position, moved]);

  return [position, moveTo] as const;
}

/**
 * Position for a floating panel that is placed fresh on each visit rather
 * than remembered.
 */
export function useAnchoredPosition(anchor: PanelAnchor) {
  const [{ position }, moveTo] = usePlacement(anchor, () => null);
  return [position, moveTo] as const;
}
