'use client';

import { useState, useRef } from 'react';
import Draggable, { DraggableEvent, DraggableData } from 'react-draggable';
import { useEventWidget } from './context/EventWidgetProvider';
import Link from 'next/link';

export default function EventWidget() {
  const { isOpen, eventData, closeWidget } = useEventWidget();
  const [position, setPosition] = useState({
    x: typeof window !== 'undefined' ? (window.innerWidth - 384) / 2 : 0, // 384px is w-96
    y:
      typeof window !== 'undefined'
        ? Math.max(
            50,
            (window.innerHeight - 300) / 2 - (window.innerHeight / 2) * (3 / 4)
          )
        : 0, // Assuming a height of 300px for initial positioning, adjusted by a 3/4 ratio of half the page's height, with a minimum 50px buffer from the top
  });
  const nodeRef = useRef(null);

  if (!isOpen || !eventData) {
    return null;
  }

  const comparisonData = encodeURIComponent(JSON.stringify(eventData));
  const comparisonUrl = `/docs?section=reports&compareEvent=${comparisonData}`;

  const handleDrag = (e: DraggableEvent, ui: DraggableData) => {
    const { x, y } = position;
    setPosition({
      x: x + ui.deltaX,
      y: y + ui.deltaY,
    });
  };

  return (
    <Draggable
      handle=".drag-handle"
      position={position}
      onDrag={handleDrag}
      nodeRef={nodeRef}
    >
      <div
        ref={nodeRef}
        className="fixed z-50 h-auto w-96 rounded-lg border border-gray-300 bg-white shadow-2xl"
      >
        <header className="drag-handle flex cursor-move items-center justify-between rounded-t-lg border-b bg-gray-100 p-3">
          <h3 className="text-lg font-bold">{eventData.eventName}</h3>
          <button
            onClick={closeWidget}
            className="text-gray-500 hover:text-red-600"
          >
            &times;
          </button>
        </header>

        <div className="max-h-80 overflow-y-auto p-4">
          <p className="mb-4 text-gray-600 italic">{eventData.summary}</p>
          <div className="space-y-2">
            {Object.entries(eventData.data).map(([key, value]) => (
              <div key={key} className="text-sm">
                <strong className="block text-gray-800">{key}:</strong>
                <span className="text-gray-600">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>

        <footer className="rounded-b-lg border-t bg-gray-50 p-3">
          <Link
            href={comparisonUrl}
            onClick={closeWidget}
            className="font-semibold text-blue-600 hover:underline"
          >
            Compare with Historical Data &rarr;
          </Link>
        </footer>
      </div>
    </Draggable>
  );
}
