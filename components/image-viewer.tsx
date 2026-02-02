'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

interface ImageViewerProps {
  imageUrl: string;
  reporterName: string;
  date: string;
  category: string;
  description: string;
  coordinates: [number, number];
  componentId: string;
  address: string;
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
  onClose,
}: ImageViewerProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

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
        onClick={onClose}
        aria-label="Close image viewer"
      />

      {/* Main viewer container */}
      <div className="animate-in zoom-in-95 relative z-10 flex max-h-[90vh] max-w-[90vw] gap-4 duration-300">
        {/* Image section */}
        <div className="relative flex h-[600px] w-[400px] items-center justify-center overflow-hidden rounded-lg bg-black">
          <Image
            src={imageUrl}
            alt="Report evidence"
            fill
            className="object-contain"
            sizes="(max-width: 1024px) 80vw, 60vw"
            priority
          />
        </div>

        {/* Metadata sidebar */}
        <div className="w-80 overflow-y-auto rounded-lg bg-white p-6 shadow-2xl">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
          >
            <X className="h-5 w-5 cursor-pointer text-gray-600" />
          </button>

          <h2 className="mb-4 pr-8 text-xl font-bold text-gray-900">
            Report Details
          </h2>

          {/* Reporter Info */}
          <div className="mb-4">
            <h3 className="mb-1 text-xs font-semibold text-gray-500 uppercase">
              Reported By
            </h3>
            <p className="text-sm text-gray-900">{reporterName}</p>
          </div>

          {/* Date */}
          <div className="mb-4">
            <h3 className="mb-1 text-xs font-semibold text-gray-500 uppercase">
              Date
            </h3>
            <p className="text-sm text-gray-900">
              {new Date(date).toLocaleString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>

          {/* Category */}
          <div className="mb-4">
            <h3 className="mb-1 text-xs font-semibold text-gray-500 uppercase">
              Category
            </h3>
            <p className="text-sm text-gray-900">{category}</p>
          </div>

          {/* Component Info */}
          <div className="mb-4">
            <h3 className="mb-1 text-xs font-semibold text-gray-500 uppercase">
              Component
            </h3>
            <p className="text-sm text-gray-900">
              {category.charAt(0).toUpperCase() + category.slice(1)} -{' '}
              {componentId}
            </p>
          </div>

          {/* Component Address */}
          <div className="mb-4">
            <h3 className="mb-1 text-xs font-semibold text-gray-500 uppercase">
              Address
            </h3>
            <p className="text-xs text-gray-900">{address}</p>
          </div>

          {/* Coordinates */}
          <div className="mb-4">
            <h3 className="mb-1 text-xs font-semibold text-gray-500 uppercase">
              Coordinates
            </h3>
            <p className="font-mono text-sm text-gray-900">
              {coordinates[1].toFixed(6)}, {coordinates[0].toFixed(6)}
            </p>
            <p className="mt-1 text-xs text-gray-500">(Lat, Lon)</p>
          </div>

          {/* Description */}
          <div className="mb-4">
            <h3 className="mb-1 text-xs font-semibold text-gray-500 uppercase">
              Description
            </h3>
            <p className="text-sm leading-relaxed text-gray-900">
              {description}
            </p>
          </div>

          {/* Divider */}
          <div className="my-4 border-t border-gray-200" />

          {/* Tips */}
          <div className="text-xs text-gray-500">
            <p className="mb-1">• Press ESC to close</p>
            <p>• Click outside to close</p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
