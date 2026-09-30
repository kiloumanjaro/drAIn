'use client';

import { useEffect, useState } from 'react';

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
}

/** Places a floating panel relative to the viewport. */
function anchoredPosition({
  width,
  height,
  anchorX = 0.5,
  anchorY = 0.5,
}: PanelAnchor): Position {
  if (typeof window === 'undefined') {
    // Server render: any value works, the panel is repositioned on mount.
    return { x: 400, y: 100 };
  }
  return {
    x: window.innerWidth * anchorX - width / 2,
    y: window.innerHeight * anchorY - height / 2,
  };
}

function readStored(storageKey: string): Position | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? (JSON.parse(saved) as Position) : null;
  } catch (error) {
    console.error(`Failed to read saved position for ${storageKey}`, error);
    return null;
  }
}

/**
 * Position for a draggable panel, remembered across visits.
 *
 * Falls back to the anchor when nothing has been stored yet, or when the
 * stored value cannot be read.
 */
export function usePersistentPosition(storageKey: string, anchor: PanelAnchor) {
  const [position, setPosition] = useState<Position>(
    () => readStored(storageKey) ?? anchoredPosition(anchor)
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(position));
    } catch (error) {
      console.error(`Failed to save position for ${storageKey}`, error);
    }
  }, [storageKey, position]);

  return [position, setPosition] as const;
}

/**
 * Position for a floating panel that is placed fresh on each visit rather
 * than remembered.
 */
export function useAnchoredPosition(anchor: PanelAnchor) {
  return useState<Position>(() => anchoredPosition(anchor));
}
