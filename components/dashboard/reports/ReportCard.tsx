'use client';

import PriorityBadge from './PriorityBadge';
import {
  formatDateShort,
  formatComponentType,
  getStatusBadgeStyle,
} from '@/lib/dashboard/calculations';
import type { ReportWithMetadata } from '@/lib/dashboard/queries';
import { MapPin, MapPinHouse, FileText, Copy } from 'lucide-react';
import { useState } from 'react';

interface ReportCardProps {
  report: ReportWithMetadata;
}

export default function ReportCard({ report }: ReportCardProps) {
  const [showCopyTooltip, setShowCopyTooltip] = useState(false);

  const statusStyle = getStatusBadgeStyle(
    report.status as 'pending' | 'in-progress' | 'resolved'
  );

  // Function to shorten address by removing province and country
  const shortenAddress = (address: string): string => {
    if (!address) return 'Location not provided';

    // Split by comma and take only the first 2-3 parts (street, city/barangay)
    const parts = address.split(',').map((part) => part.trim());

    // Remove common province/country indicators
    const filteredParts = parts.filter((part) => {
      const lowerPart = part.toLowerCase();
      return (
        !lowerPart.includes('philippines') &&
        !lowerPart.includes('cebu') &&
        !lowerPart.includes('province')
      );
    });

    // Take first 2 parts maximum for concise display
    return filteredParts.slice(0, 2).join(', ');
  };

  // Determine component type from component_id
  const componentType = (() => {
    if (!report.componentId) return 'inlets';
    const lower = report.componentId.toLowerCase();
    if (lower.includes('inlet')) return 'inlets';
    if (lower.includes('outlet')) return 'outlets';
    if (lower.includes('drain')) return 'storm_drains';
    if (lower.includes('pipe')) return 'man_pipes';
    return 'inlets';
  })();

  const images = report.image ? [report.image] : [];

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(report.id);
      setShowCopyTooltip(true);
      setTimeout(() => setShowCopyTooltip(false), 2000);
    } catch (err) {
      console.error('Failed to copy ID:', err);
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[#ced1cd] bg-white transition-shadow hover:shadow-lg">
      {/* Image Gallery */}
      <div className="relative h-48 w-full overflow-hidden bg-gray-100">
        {images.length > 0 ? (
          <img
            src={images[0]}
            alt={`Report ${report.id}`}
            className="h-full w-full cursor-pointer object-cover transition-transform hover:scale-105"
            onClick={() => window.open(images[0], '_blank')}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            No image available
          </div>
        )}
      </div>

      <div>
        {/* Content */}
        <div className="space-y-3 p-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <PriorityBadge priority={report.priority} size="sm" />
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusStyle.bgColor} ${statusStyle.textColor}`}
            >
              {statusStyle.label}
            </span>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800">
              {formatComponentType(componentType as any)}
            </span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" />
            <p className="text-xs text-gray-600">
              Location{' '}
              <span className="font-semibold text-gray-900">
                {shortenAddress(report.address)}
              </span>
            </p>
          </div>

          {/* Zone */}
          {report.zone && (
            <div className="flex items-center gap-2">
              <MapPinHouse className="h-4 w-4 flex-shrink-0 text-gray-500" />
              <p className="text-xs text-gray-600">
                Zone{' '}
                <span className="font-semibold text-gray-900">
                  {report.zone}
                </span>
              </p>
            </div>
          )}

          {/* Description */}
          {report.description && (
            <div className="flex items-center gap-2">
              <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" />
              <p className="text-xs text-gray-600">{report.description}</p>
            </div>
          )}
        </div>

        {/* Date and Copy ID */}
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2">
          <p className="text-xs text-gray-600">
            Reported on{' '}
            <span className="font-medium">{formatDateShort(report.date)}</span>
          </p>

          {/* Copy ID Button with Tooltip */}
          <div className="relative">
            <button
              onClick={handleCopyId}
              onMouseEnter={() => !showCopyTooltip && setShowCopyTooltip(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
              title="Copy ID"
            >
              <Copy className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700" />
            </button>

            {/* Tooltip */}
            {showCopyTooltip && (
              <div className="absolute right-0 bottom-full z-10 mb-1 rounded bg-gray-800 px-2 py-1 text-xs whitespace-nowrap text-white">
                ID Copied!
                <div className="absolute top-full right-2 h-0 w-0 border-t-2 border-r-2 border-l-2 border-transparent border-t-gray-800"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
