import { useState, useRef, useEffect } from 'react';
import type { DetailItem, FieldConfig } from '../types';
import dynamic from 'next/dynamic';

// The 3D viewer drags in three.js (~1.8 MB of script), which otherwise
// ships with every page that renders the control panel, the map included.
// Loaded only when a detail view actually shows a model.
const ModelViewer = dynamic(
  () => import('@/components/simulation/model-viewer'),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground flex h-[250px] items-center justify-center text-xs">
        Loading viewer…
      </div>
    ),
  }
);
import { ErrorBoundary } from '@/components/common/error-boundary';
import { DataFieldCard } from './data-field-card';
import { ProgressTimeline } from './progress-timeline';
import { activeTimelineIndex, isAtScrollEnd } from './detail-view.helpers';

/**
 * The element that scrolls this view: the nearest one, itself included, that
 * is allowed to scroll and has more content than height. Null when
 * everything fits.
 */
function findScroller(start: HTMLElement): HTMLElement | null {
  for (let el: HTMLElement | null = start; el; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      el.scrollHeight > el.clientHeight
    ) {
      return el;
    }
  }
  return null;
}

interface DetailViewProps {
  item: DetailItem;
  fields: FieldConfig[];
  modelUrl: string;
}

/** "/models/storm_drain.glb" -> "storm drain". */
function modelName(url: string): string {
  const file = url.split('/').pop() ?? '';
  return file.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
}

export function DetailView({ item, fields, modelUrl }: DetailViewProps) {
  const [showModel, setShowModel] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [atScrollEnd, setAtScrollEnd] = useState(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to top when item changes
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    // Find the scrollable parent element
    let scrollableElement: HTMLElement | null = scrollContainerRef.current;
    let attempts = 0;
    const maxAttempts = 5;

    while (scrollableElement && attempts < maxAttempts) {
      if (scrollableElement.scrollHeight > scrollableElement.clientHeight) {
        scrollableElement.scrollTop = 0;
        break;
      }
      scrollableElement = scrollableElement.parentElement;
      attempts++;
    }

    // Fallback: scroll the element itself
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [item]);

  // Track which card is currently in view. Measured against the panel's own
  // scroller: against the browser window, cards low in the panel never
  // counted as in view.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const scroller = findScroller(container);

    // The last cards stop at the bottom edge, short of the middle band
    // below, so the end of the scroll is watched for separately.
    const checkScrollEnd = () =>
      setAtScrollEnd(scroller ? isAtScrollEnd(scroller) : true);
    scroller?.addEventListener('scroll', checkScrollEnd, { passive: true });
    // Reports once on observing, then whenever the panel changes height.
    const resizeObserver = new ResizeObserver(checkScrollEnd);
    resizeObserver.observe(scroller ?? container);

    const observers = cardRefs.current.map((ref, index) => {
      if (!ref) return null;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveIndex(index);
          }
        },
        {
          root: scroller,
          threshold: 0.6, // Card needs to be 60% visible
          rootMargin: '-20% 0px -20% 0px', // Focus on center of the panel
        }
      );

      observer.observe(ref);
      return observer;
    });

    return () => {
      scroller?.removeEventListener('scroll', checkScrollEnd);
      resizeObserver.disconnect();
      observers.forEach((observer) => observer?.disconnect());
    };
  }, [fields.length]);

  return (
    <div
      ref={scrollContainerRef}
      className="space-y-4 overflow-y-auto px-4 pb-8"
    >
      <div className="space-y-2">
        <div className="flex rounded-md border border-[#ced1cd]">
          {!showModel ? (
            <button
              type="button"
              onClick={() => setShowModel(true)}
              className="flex h-[250px] flex-1 !cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-none hover:bg-[#f5f5f5]"
            >
              <svg
                aria-hidden="true"
                className="text-muted-foreground/50 h-15 w-15"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"
                />
              </svg>
              <span className="text-sm font-medium">
                Click to Load 3D Model
              </span>
            </button>
          ) : (
            // The viewer's script, the model file and WebGL itself can each
            // fail; none of that should take the map page down with it.
            <ErrorBoundary
              resetKey={modelUrl}
              fallback={({ reset }) => (
                <div
                  role="alert"
                  className="flex h-[250px] flex-1 flex-col items-center justify-center gap-3"
                >
                  <span className="text-sm font-medium">
                    3D model unavailable
                  </span>
                  <button
                    type="button"
                    onClick={reset}
                    className="cursor-pointer rounded-md border border-[#ced1cd] px-3 py-1 text-xs hover:bg-[#f5f5f5]"
                  >
                    Try again
                  </button>
                </div>
              )}
            >
              <ModelViewer
                url={modelUrl}
                label={`Rotating 3D model of a generic ${modelName(modelUrl)}`}
                defaultRotationX={0}
                defaultRotationY={0}
                autoRotate
                width={290}
                height={250}
                defaultZoom={1.3}
                showScreenshotButton={false}
                enableManualZoom={false}
                autoFrame
              />
            </ErrorBoundary>
          )}
        </div>
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-2 dark:border-amber-900/30 dark:bg-amber-950/20">
          <svg
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
            The 3D model shown is a generic visual guide and not specifications
            of this specific component.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <ProgressTimeline
          fieldCount={fields.length}
          activeIndex={activeTimelineIndex(
            activeIndex,
            atScrollEnd,
            fields.length
          )}
        />

        {/* Cards column */}
        <div className="flex flex-1 flex-col gap-4">
          {fields.map((field, index) => (
            <DataFieldCard
              key={field.key}
              ref={(el) => {
                cardRefs.current[index] = el;
              }}
              label={field.label}
              value={String(item[field.key as keyof typeof item])}
              description={field.description}
              unit={field.unit}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
