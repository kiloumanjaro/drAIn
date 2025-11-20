'use client';

import { useState, useRef } from 'react';
import Draggable, { DraggableEvent, DraggableData } from 'react-draggable';
import { useEventWidget } from './context/EventWidgetProvider';
import Link from 'next/link';

export default function EventWidget() {
  const { isOpen, eventData, closeWidget } = useEventWidget();
  const [position, setPosition] = useState({
    x: typeof window !== 'undefined' ? (window.innerWidth - 384) / 2 : 0, // 384px is w-96
    y: typeof window !== 'undefined' ? Math.max(50, (window.innerHeight - 300) / 2 - (window.innerHeight / 2) * (3/4)) : 0, // Assuming a height of 300px for initial positioning, adjusted by a 3/4 ratio of half the page's height, with a minimum 50px buffer from the top
  });
  const nodeRef = useRef(null);

  if (!isOpen || !eventData) {
    return null;
  }

  const comparisonData = encodeURIComponent(JSON.stringify(eventData));
  const comparisonUrl = `/reports?compareEvent=${comparisonData}`;

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
        className="fixed w-96 h-auto bg-white rounded-lg shadow-2xl z-50 border border-gray-300"
      >
        <header className="drag-handle cursor-move bg-gray-100 p-3 flex justify-between items-center rounded-t-lg border-b">
          <h3 className="font-bold text-lg">{eventData.eventName}</h3>
          <button onClick={closeWidget} className="text-gray-500 hover:text-red-600">&times;</button>
        </header>

        <div className="p-4 overflow-y-auto max-h-80">
          <p className="italic text-gray-600 mb-4">{eventData.summary}</p>
          <div className="space-y-2">
            {Object.entries(eventData.data).map(([key, value]) => (
              <div key={key} className="text-sm">
                <strong className="block text-gray-800">{key}:</strong>
                <span className="text-gray-600">{value as any}</span>
              </div>
            ))}
          </div>
        </div>

        <footer className="p-3 bg-gray-50 rounded-b-lg border-t">
          <Link href={comparisonUrl} onClick={closeWidget} className="text-blue-600 hover:underline font-semibold">
            Compare with Historical Data &rarr;
          </Link>
        </footer>
      </div>
    </Draggable>
  );
}
