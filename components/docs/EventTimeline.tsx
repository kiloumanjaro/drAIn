'use client';

import { useEffect, useRef, useState } from 'react';

interface EventTimelineProps {
  count: number;
}

export default function EventTimeline({ count }: EventTimelineProps) {
  const [visibleSet, setVisibleSet] = useState<Set<number>>(new Set());
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    rowRefs.current.forEach((el, index) => {
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          setVisibleSet((prev) => {
            const next = new Set(prev);
            if (entry.isIntersecting) {
              next.add(index);
            } else {
              next.delete(index);
            }
            return next;
          });
        },
        { threshold: 0, rootMargin: '-40% 0px -40% 0px' }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [count]);

  // Highest index currently in the viewport
  const activeIndex = visibleSet.size > 0 ? Math.max(...visibleSet) : -1;

  const fillPercent =
    activeIndex >= 0 ? ((activeIndex + 0.5) / count) * 100 : 0;

  return (
    <div className="relative flex flex-col" style={{ minWidth: '20px' }}>
      {Array.from({ length: count }).map((_, index) => {
        const isActive = index <= activeIndex;
        const isLast = index === count - 1;
        const lineActive = index < activeIndex;

        return (
          <div
            key={index}
            ref={(el) => {
              rowRefs.current[index] = el;
            }}
            className="relative flex shrink-0 flex-col items-center"
            style={{ minHeight: '67px', flex: '1 1 auto' }}
          >
            {/* Dot */}
            <div
              className={`relative z-20 h-2.5 w-2.5 shrink-0 rounded-full border-2 transition-colors duration-300 ${
                isActive
                  ? 'border-blue-400 bg-blue-400'
                  : 'border-slate-300 bg-white'
              }`}
            />

            {/* Connector line stretching to the next dot */}
            {!isLast && (
              <div className="relative z-10 w-0.5 flex-1">
                <div className="absolute inset-0 bg-[#e2e8f0]" />
                <div
                  className="absolute top-0 right-0 left-0 bg-blue-400 transition-all duration-500 ease-out"
                  style={{ height: lineActive ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
