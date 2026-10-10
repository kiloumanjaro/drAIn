'use client';

import {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { getInitials } from '@/lib/user-initials';
import { X, History, Link } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type mapboxgl from 'mapbox-gl';
import { ImageViewer } from '@/components/common/image-viewer';
import { COMPACT_MAP_QUERY, isCompactMap } from '@/lib/layout/compact-map';
import { prefersReducedMotion } from '@/lib/map/effects/rain-utils';
import {
  PHONE_QUERY,
  PIN_REST_CHECKS,
  reportPinCrowded,
  reportPinOffRest,
  reportPinOffset,
  reportPinRecentre,
  reportPinRest,
  type MapPoint,
  type ReportPinLayout,
} from '@/lib/map/report-pin';

interface Report {
  reporterName: string;
  date: string;
  status: string;
  componentId: string;
  category: string;
  description: string;
  image?: string | null;
  address: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  resolvedAt?: string | null;
}

interface Props {
  reportSize: Promise<number>;
  report: Report;
  map: mapboxgl.Map | null;
  coordinates: [number, number];
  onOpen?: () => void;
  /** The pin was opened where the control sheet leaves its popup no room. */
  onCrowded?: () => void;
  onHistoryClick?: () => void;
}

export interface ReportBubbleRef {
  close: () => void;
}

/** Which layout /map is in now (see lib/map/report-pin.ts). */
function reportPinLayout(): ReportPinLayout {
  if (!isCompactMap()) return 'desktop';
  return window.matchMedia(PHONE_QUERY).matches ? 'phone' : 'tablet';
}

/** How far the map zooms out before an open popup is closed. */
const ZOOM_OUT_MARGIN = 0.05;

/**
 * What ends the watch on each map for a pin coming to rest (see
 * settlePinAtRest). A map has one at a time.
 */
const restWatches = new WeakMap<mapboxgl.Map, () => void>();

/**
 * Move the pin the rest of the way to its rest. The move that sends it
 * there aims at its place on flat ground. How high the ground is the map
 * knows only once it has loaded it, which can be after the move has ended
 * and always is for a jump, so the pin is looked at when the move ends and
 * each time the map falls idle after that, and moved by what is left. Any
 * other move ends the watch: the pin stays where the visitor, or the next
 * pin opened, puts it.
 */
function settlePinAtRest(
  map: mapboxgl.Map,
  coordinates: [number, number],
  rest: MapPoint
) {
  let checksLeft = PIN_REST_CHECKS;
  let correcting = false;

  const check = () => {
    checksLeft -= 1;
    if (checksLeft === 0) end();
    if (!reportPinOffRest(map.project(coordinates), rest)) return;
    correcting = true;
    map.easeTo({
      center: reportPinRecentre(
        map.getCenter().toArray(),
        coordinates,
        map.unproject([rest.x, rest.y]).toArray()
      ),
      duration: 300,
    });
    correcting = false;
  };
  const giveWay = () => {
    if (!correcting) end();
  };
  const end = () => {
    map.off('moveend', check);
    map.off('idle', check);
    map.off('movestart', giveWay);
    restWatches.delete(map);
  };

  // A move made without animation has ended already.
  if (map.isMoving()) map.once('moveend', check);
  map.on('idle', check);
  map.on('movestart', giveWay);
  restWatches.set(map, end);
}

/**
 * Move the map so the pin is where its popup can be read: the middle of the
 * map, or under a sheet near the top instead (lib/map/report-pin.ts).
 * With a zoom it is the long way round, for a pin being opened; without,
 * the map slides there at the zoom it is at. `onArrive` is called when that
 * move ends. Returns whether the sheet leaves the popup no room even so.
 */
function bringPinIntoView(
  map: mapboxgl.Map,
  coordinates: [number, number],
  { zoom, onArrive }: { zoom?: number; onArrive?: () => void } = {}
): boolean {
  const layout = reportPinLayout();
  const { clientWidth, clientHeight } = map.getContainer();
  // An offset, not padding: padding stays on the map afterwards and would
  // shift every later move, whatever the sheet does next.
  const offset = reportPinOffset(layout, clientHeight);

  // A move still under way is ended first, and the watch on the pin it was
  // for: its end must not be taken for the end of this one.
  restWatches.get(map)?.();
  map.stop();
  // Set before the move, which ends inside the call when it is made without
  // animation.
  if (onArrive) map.once('moveend', onArrive);
  const camera = { center: coordinates, ...(offset && { offset }) };
  // For a visitor who asked for less motion Mapbox turns flyTo into a plain
  // jump to the centre, dropping the offset: the pin and its popup ended up
  // behind the sheet. easeTo jumps for them too, and keeps the offset.
  if (zoom === undefined) {
    map.easeTo(camera);
  } else if (prefersReducedMotion()) {
    map.easeTo({ ...camera, zoom });
  } else {
    map.flyTo({
      ...camera,
      zoom,
      duration: 1500,
      easing: (t) => t * (2 - t),
    });
  }
  // After the move has started: the watch gives way to any move but its own.
  if (offset) {
    settlePinAtRest(
      map,
      coordinates,
      reportPinRest(offset, clientWidth, clientHeight)
    );
  }
  return reportPinCrowded(layout, clientHeight);
}

export const ReportBubble = forwardRef<ReportBubbleRef, Props>(
  function ReportBubble(
    { reportSize, report, map, coordinates, onOpen, onCrowded, onHistoryClick },
    ref
  ) {
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [showImageViewer, setShowImageViewer] = useState(false);
    const [resolvedReportSize, setResolvedReportSize] = useState<number>(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const previousZoomRef = useRef<number | null>(null);
    const isAnimatingRef = useRef(false);

    const CLOSING_DURATION = 300; // Consistent fade-out duration
    const initials = getInitials(report.reporterName);

    useEffect(() => {
      reportSize.then((size) => setResolvedReportSize(size));
    }, [reportSize]);

    const handleOpen = () => {
      onOpen?.();
      setIsClosing(false);
      setIsOpen(true);

      if (map) {
        isAnimatingRef.current = true;
        const crowded = bringPinIntoView(map, coordinates, {
          zoom: 18,
          onArrive: () => {
            isAnimatingRef.current = false;
            previousZoomRef.current = map.getZoom();
          },
        });
        if (crowded) onCrowded?.();
      }
    };

    const onClose = () => {
      setIsClosing(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
      }, CLOSING_DURATION);
    };

    useImperativeHandle(ref, () => ({
      close: onClose,
    }));

    useEffect(() => {
      if (!containerRef.current) return;
      const mapboxPopup = containerRef.current.closest('.mapboxgl-popup');

      if (mapboxPopup) {
        mapboxPopup.classList.toggle('active-popup', isOpen);
      }
    }, [isOpen]);

    // The layout can change under an open popup (a window resized, a tablet
    // turned): the sheet arrives over the middle of the map, or goes. The
    // pin is sent to its place in the new layout.
    useEffect(() => {
      if (!map || !isOpen) return;

      const layouts = [COMPACT_MAP_QUERY, PHONE_QUERY].map((query) =>
        window.matchMedia(query)
      );
      const handleLayoutChange = () => {
        // The offset is measured from the middle of the map as it is now.
        map.resize();
        if (bringPinIntoView(map, coordinates)) onCrowded?.();
      };

      layouts.forEach((layout) =>
        layout.addEventListener('change', handleLayoutChange)
      );
      return () => {
        layouts.forEach((layout) =>
          layout.removeEventListener('change', handleLayoutChange)
        );
      };
    }, [map, isOpen, coordinates, onCrowded]);

    // Close popup when zooming OUT
    useEffect(() => {
      if (!map || !isOpen) return;

      // Measured from where each zoom starts, and only past a margin. Over
      // terrain the map's zoom shifts a little with every move, zooming or
      // not, and the first step of a zoom in comes a touch below where it
      // started (0.003 over the 50m contour): either closed the popup.
      const handleZoomStart = () => {
        if (!isAnimatingRef.current) previousZoomRef.current = map.getZoom();
      };

      const handleZoom = () => {
        if (isAnimatingRef.current) return;

        const previousZoom = previousZoomRef.current;
        if (
          previousZoom !== null &&
          map.getZoom() < previousZoom - ZOOM_OUT_MARGIN
        ) {
          onClose();
        }
      };

      map.on('zoomstart', handleZoomStart);
      map.on('zoom', handleZoom);
      return () => {
        map.off('zoomstart', handleZoomStart);
        map.off('zoom', handleZoom);
      };
    }, [map, isOpen]);

    const getStatusStyle = (status: string) => {
      switch (status) {
        case 'resolved':
          return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
        case 'unresolved':
          return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
        case 'pending':
          return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
        default:
          return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
      }
    };

    // The pin's colour alone told the four component types apart. The
    // letter in its corner and its name say the same without colour.
    const getComponentLabel = (type: string) => {
      switch (type) {
        case 'man_pipes':
          return 'Pipe';
        case 'storm_drains':
          return 'Storm drain';
        case 'inlets':
          return 'Inlet';
        case 'outlets':
          return 'Outlet';
        default:
          return 'Component';
      }
    };
    const componentLabel = getComponentLabel(report.category);
    const pinName = `${componentLabel} report by ${report.reporterName}, ${report.status}`;

    const getComponentColor = (type: string) => {
      switch (type) {
        case 'man_pipes':
          return 'bg-[#8B008B] text-white';
        // White on these three is too faint to read; dark text is not.
        case 'storm_drains':
          return 'bg-[#0088ff] text-gray-950';
        case 'inlets':
          return 'bg-[#00cc44] text-gray-950';
        case 'outlets':
          return 'bg-[#cc0000] text-white';
        default:
          return 'bg-gray-400 text-gray-950';
      }
    };

    return (
      <div ref={containerRef} className="relative">
        {/* Initials button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleOpen();
          }}
          aria-label={pinName}
          aria-expanded={isOpen}
          title={pinName}
          className={`relative flex h-6 w-6 items-center justify-center rounded-full pt-0.5 text-xs font-bold transition-all duration-200 hover:scale-110 hover:shadow-lg active:scale-95 ${getComponentColor(
            report.category
          )}`}
        >
          {initials}
          {/* Dark with a white ring, so it stands off the pin it sits on
              and off a neighbouring pin, whatever their colours. */}
          <span
            aria-hidden="true"
            className="absolute -right-1 -bottom-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gray-900 text-[9px] leading-none font-bold text-white ring-1 ring-white"
          >
            {componentLabel.charAt(0)}
          </span>
        </button>

        {/* Popup. Beside the pin; on phones below it, a little left of
            centre and narrow enough to miss the buttons down the map's right
            edge. A tablet has the width for the desktop placement, and the
            pin is sent left of centre to make room for it
            (lib/map/report-pin.ts). There a long description stops at six
            lines and scrolls, so the footer stays above the control sheet. */}
        {isOpen && (
          <div
            className={`absolute top-0 left-10 w-2xs rounded-lg border border-gray-200 bg-white p-4 shadow-lg max-md:top-9 max-md:left-[calc(50%-2rem)] max-md:w-[min(18rem,calc(100vw-7.5rem))] max-md:-translate-x-1/2 ${
              isClosing
                ? 'animate-out fade-out duration-300'
                : 'animate-in fade-in slide-in-from-left-2'
            }`}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              aria-label="Close report"
              className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
            >
              <X
                aria-hidden="true"
                className="h-4 w-4 cursor-pointer text-gray-600"
              />
            </button>

            {/* Header */}
            <div className="mb-2 flex items-center gap-3">
              <div
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full pt-0.5 text-sm font-bold ${getComponentColor(
                  report.category
                )}`}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                {/* pr-6: the close button sits over this corner. */}
                <h3
                  title={report.reporterName}
                  className="min-w-0 truncate pr-6 font-semibold text-gray-900"
                >
                  {report.reporterName}
                </h3>
                <div className="flex flex-row items-end gap-2">
                  <p className="pb-1 text-xs text-gray-500">
                    {formatDistanceToNow(new Date(report.date), {
                      addSuffix: true,
                    })}
                  </p>
                  <div
                    className={`mb-1 flex h-5 items-center justify-center rounded-md border px-3 text-[10px] ${getStatusStyle(
                      report.status
                    )}`}
                  >
                    {report.status}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-4 ml-[48px] md:max-lg:max-h-24 md:max-lg:overflow-y-auto">
              <p className="flex flex-col gap-2 text-xs [overflow-wrap:anywhere] text-gray-800">
                {report.description}{' '}
                {report.image && (
                  <button
                    onClick={() => setShowImageViewer(true)}
                    className="inline-flex items-center gap-1 font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline"
                  >
                    <span className="ml-[-1px] flex cursor-pointer flex-row items-center gap-1">
                      Image Attached
                      <Link aria-hidden="true" className="mb-0.5 h-3 w-3" />
                    </span>
                  </button>
                )}
              </p>
            </div>

            {/* Footer */}
            <div className="flex flex-row items-center justify-between">
              <div className="flex flex-row items-center gap-1">
                <span className="font-bold text-[#7e7e7e]">
                  {componentLabel} {report.componentId}
                </span>
                <span className="text-[#7e7e7e]">
                  has {resolvedReportSize}{' '}
                  {resolvedReportSize > 1 ? 'reports' : 'report'}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onHistoryClick?.();
                }}
                aria-label={`Report history of ${report.componentId}`}
                className="flex cursor-pointer items-center justify-center rounded-full border border-[#bcbcbc] bg-[#EBEBEB] p-1 transition-colors hover:bg-[#E0E0E0] disabled:opacity-50"
              >
                <History
                  aria-hidden="true"
                  className="h-4 w-4 text-[#8D8D8D]"
                />
              </button>
            </div>
          </div>
        )}

        {/* Image Viewer */}
        {showImageViewer && report.image && (
          <ImageViewer
            imageUrl={report.image}
            reporterName={report.reporterName}
            date={report.date}
            category={report.category}
            description={report.description}
            coordinates={coordinates}
            componentId={report.componentId}
            address={report.address}
            status={report.status as 'pending' | 'in-progress' | 'resolved'}
            priority={report.priority || 'low'}
            resolvedAt={report.resolvedAt ?? undefined}
            onClose={() => setShowImageViewer(false)}
          />
        )}
      </div>
    );
  }
);
