'use client';

import {
  X,
  Maximize2,
  Minimize2,
  Loader2,
  CheckCircle2,
  Grid3x3,
  MapPin,
  FileText,
  Compass,
  MapPinned,
  Info,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import StatusBadge from '@/components/dashboard/reports/StatusBadge';
import PriorityBadge from '@/components/dashboard/reports/PriorityBadge';
import ComponentTypeBadge from '@/components/dashboard/reports/ComponentTypeBadge';
import { getInitials } from '@/lib/user-initials';

interface ImageViewerProps {
  imageUrl: string;
  reporterName: string;
  date: string;
  category: string;
  description: string;
  coordinates: [number, number];
  componentId: string;
  address: string;
  status: 'pending' | 'in-progress' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'critical';
  resolvedAt?: string;
  onClose: () => void;
}

export function ImageViewer({
  imageUrl,
  reporterName,
  date,
  category,
  description,
  coordinates,
  componentId,
  address,
  status,
  priority,
  resolvedAt,
  onClose,
}: ImageViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, isFullscreen]);

  // Prevent body scroll when viewer is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return createPortal(
    // This is the element creating the dark background overlay
    <div className="animate-in fade-in fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm duration-200">
      {/* Backdrop - clicking closes viewer */}
      <div
        className="absolute inset-0"
        onClick={isFullscreen ? () => setIsFullscreen(false) : onClose}
        aria-label="Close image viewer"
      />

      {/* Fullscreen image view */}
      {isFullscreen ? (
        <div className="animate-in zoom-in-95 relative z-10 flex h-[95vh] w-[95vw] items-center justify-center duration-300">
          <Image
            src={imageUrl}
            alt="Report evidence"
            fill
            className="object-contain"
            sizes="95vw"
            priority
          />
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 transition-colors hover:bg-black/70"
          >
            <Minimize2 className="h-5 w-5 cursor-pointer text-white" />
          </button>
        </div>
      ) : (
        /* Main viewer container */
        <div className="animate-in zoom-in-95 relative z-10 flex max-h-[95vh] max-w-[90vw] items-stretch gap-4 duration-300">
          {/* Image section */}
          <div
            className="group relative flex min-h-150 w-137.5 items-center justify-center overflow-hidden rounded-lg"
            style={{ backgroundColor: '#4b4b4c' }}
          >
            {isImageLoading && (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center"
                style={{ backgroundColor: '#4b4b4c' }}
              >
                <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
              </div>
            )}
            <Image
              src={imageUrl}
              alt="Report evidence"
              fill
              className="rounded-lg object-cover"
              sizes="550px"
              priority
              onLoadingComplete={() => setIsImageLoading(false)}
            />
            {/* Expand button */}
            <button
              onClick={() => setIsFullscreen(true)}
              className="absolute top-3 right-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 opacity-0 transition-all group-hover:opacity-100 hover:bg-black/70"
            >
              <Maximize2 className="h-4 w-4 cursor-pointer text-white" />
            </button>
          </div>

          {/* Metadata sidebar */}
          <div className="w-96 overflow-y-auto rounded-lg bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 p-3 pr-4">
              <div className="flex items-center gap-2 pl-3.5">
                <MapPinned className="h-4 w-4 text-gray-600" />
                <h2 className="text-sm text-gray-600">
                  Drainage Map / Report Details
                </h2>
              </div>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-full border transition-colors"
                style={{ borderColor: '#DCDCDC', backgroundColor: '#EBEBEB' }}
              >
                <X
                  className="h-4 w-4 cursor-pointer"
                  style={{ color: '#8D8D8D' }}
                />
              </button>
            </div>

            <div className="p-6 pt-4">
              {/* Reporter + Date */}
              <div className="mb-5 flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white ${
                    category === 'man_pipes'
                      ? 'bg-[#8B008B]'
                      : category === 'storm_drains'
                        ? 'bg-[#0088ff]'
                        : category === 'inlets'
                          ? 'bg-[#00cc44]'
                          : category === 'outlets'
                            ? 'bg-[#cc0000]'
                            : 'bg-gray-400'
                  }`}
                >
                  {getInitials(reporterName)}
                </div>
                <div>
                  <p className="text-sm text-gray-900">{reporterName}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(date).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="group relative ml-auto">
                  <Info className="h-4 w-4 text-gray-600 opacity-70" />
                  <span className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 hidden -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white group-hover:block">
                    Reporter
                  </span>
                </div>
              </div>

              {/* Tags */}
              <div className="mb-5">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={status} />
                  <PriorityBadge priority={priority} size="sm" />
                  <ComponentTypeBadge
                    componentType={
                      category as
                        | 'inlets'
                        | 'outlets'
                        | 'storm_drains'
                        | 'man_pipes'
                    }
                  />
                </div>
              </div>
              <div className="mt-8 px-1.5">
                {/* Component Address */}
                <div className="mb-5">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-gray-600" />
                    <h3 className="text-xs font-semibold text-gray-600 uppercase">
                      Address
                    </h3>
                    <p className="ml-auto truncate font-mono text-sm text-gray-500">
                      {address.split(',')[0]}
                    </p>
                  </div>
                </div>

                {/* Component Info */}
                <div className="mb-5">
                  <div className="flex items-center gap-2">
                    <Grid3x3 className="h-4 w-4 shrink-0 text-gray-600" />
                    <h3 className="text-xs font-semibold text-gray-600 uppercase">
                      Component ID
                    </h3>
                    <p className="ml-auto font-mono text-sm text-gray-500">
                      {componentId}
                    </p>
                  </div>
                </div>

                {/* Coordinates */}
                <div className="mb-5">
                  <div className="group flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Compass className="h-4 w-4 shrink-0 text-gray-600" />
                      <h3 className="text-xs font-semibold text-gray-600 uppercase">
                        Coordinates
                      </h3>
                    </div>
                    <p className="ml-auto font-mono text-sm text-gray-500">
                      {coordinates[1].toFixed(6)}, {coordinates[0].toFixed(6)}
                    </p>
                    <span className="pointer-events-none absolute hidden rounded bg-gray-900 px-2 py-1 text-center text-xs whitespace-nowrap text-white group-hover:block">
                      (Lat, Lon)
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-5">
                  <div className="mb-3 flex items-start gap-2 pb-1">
                    <FileText className="h-4 w-4 shrink-0 text-gray-600" />
                    <h3 className="text-xs font-semibold text-gray-600 uppercase">
                      Description
                    </h3>
                  </div>
                  <p className="rounded border border-gray-200 bg-gray-50 p-3 text-sm leading-relaxed text-gray-900">
                    {description}
                  </p>
                </div>
              </div>

              {/* Resolved Date */}
              {status === 'resolved' && resolvedAt && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-gray-600" />
                    <h3 className="text-xs font-semibold text-gray-600 uppercase">
                      Resolved On
                    </h3>
                  </div>
                  <p className="text-sm text-gray-900">
                    {new Date(resolvedAt).toLocaleString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
