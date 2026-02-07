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
import { ImageViewer } from '@/components/image-viewer';

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
  resolvedAt?: string;
}

interface Props {
  reportSize: Promise<number>;
  report: Report;
  map: mapboxgl.Map | null;
  coordinates: [number, number];
  onOpen?: () => void;
  onHistoryClick?: () => void;
}

export interface ReportBubbleRef {
  close: () => void;
}

export const ReportBubble = forwardRef<ReportBubbleRef, Props>(
  function ReportBubble(
    { reportSize, report, map, coordinates, onOpen, onHistoryClick },
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
        map.flyTo({
          center: coordinates,
          zoom: 18,
          duration: 1500,
          easing: (t) => t * (2 - t),
          essential: true,
        });

        map.once('moveend', () => {
          isAnimatingRef.current = false;
          previousZoomRef.current = map.getZoom();
        });
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

    // Close popup when zooming OUT
    useEffect(() => {
      if (!map || !isOpen) return;

      const handleZoom = () => {
        if (isAnimatingRef.current) return;

        const currentZoom = map.getZoom();
        const previousZoom = previousZoomRef.current;

        if (previousZoom !== null && currentZoom < previousZoom) {
          onClose();
        }

        previousZoomRef.current = currentZoom;
      };

      map.on('zoom', handleZoom);
      return () => {
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

    const getComponentColor = (type: string) => {
      switch (type) {
        case 'man_pipes':
          return 'bg-[#8B008B]';
        case 'storm_drains':
          return 'bg-[#0088ff]';
        case 'inlets':
          return 'bg-[#00cc44]';
        case 'outlets':
          return 'bg-[#cc0000]';
        default:
          return 'bg-gray-400';
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
          className={`relative flex h-6 w-6 items-center justify-center rounded-full pt-0.5 text-xs font-bold text-white transition-all duration-200 hover:scale-110 hover:shadow-lg active:scale-95 ${getComponentColor(
            report.category
          )}`}
        >
          {initials}
        </button>

        {/* Popup */}
        {isOpen && (
          <div
            className={`absolute top-0 left-10 w-2xs rounded-lg border border-gray-200 bg-white p-4 shadow-lg ${
              isClosing
                ? 'animate-out fade-out duration-300'
                : 'animate-in fade-in slide-in-from-left-2'
            }`}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
            >
              <X className="h-4 w-4 cursor-pointer text-gray-600" />
            </button>

            {/* Header */}
            <div className="mb-2 flex items-center gap-3">
              <div
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full pt-0.5 text-sm font-bold text-white ${getComponentColor(
                  report.category
                )}`}
              >
                {initials}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  {report.reporterName}
                </h3>
                <div className="flex flex-row items-end gap-2">
                  <p className="text-2xs pb-1 text-gray-500">
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
            <div className="mb-4 ml-[48px]">
              <p className="flex flex-col gap-2 text-xs text-gray-800">
                {report.description}{' '}
                {report.image && (
                  <button
                    onClick={() => setShowImageViewer(true)}
                    className="inline-flex items-center gap-1 font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline"
                  >
                    <span className="ml-[-1px] flex cursor-pointer flex-row items-center gap-1">
                      Image Attached
                      <Link className="mb-0.5 h-3 w-3" />
                    </span>
                  </button>
                )}
              </p>
            </div>

            {/* Footer */}
            <div className="flex flex-row items-center justify-between">
              <div className="flex flex-row items-center gap-1">
                <span className="font-bold text-[#7e7e7e]">
                  {report.componentId}
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
                className="flex cursor-pointer items-center justify-center rounded-full border border-[#bcbcbc] bg-[#EBEBEB] p-1 transition-colors hover:bg-[#E0E0E0] disabled:opacity-50"
              >
                <History className="h-4 w-4 text-[#8D8D8D]" />
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
            resolvedAt={report.resolvedAt}
            onClose={() => setShowImageViewer(false)}
          />
        )}
      </div>
    );
  }
);
