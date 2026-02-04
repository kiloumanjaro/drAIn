'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import PriorityBadge from './PriorityBadge';
import StatusBadge from './StatusBadge';
import ComponentTypeBadge from './ComponentTypeBadge';
import { formatDateShort } from '@/lib/dashboard/calculations';
import type { ReportWithMetadata } from '@/lib/dashboard/queries';
import { MapPin, MapPinHouse, FileText, Copy } from 'lucide-react';
import { useState } from 'react';

interface ReportCardProps {
  report: ReportWithMetadata;
  onPriorityFilter?: (priority: 'low' | 'medium' | 'high' | 'critical') => void;
  onStatusFilter?: (status: 'pending' | 'in-progress' | 'resolved') => void;
  onComponentTypeFilter?: (
    componentType: 'inlets' | 'outlets' | 'storm_drains' | 'man_pipes'
  ) => void;
}

export default function ReportCard({
  report,
  onPriorityFilter,
  onStatusFilter,
  onComponentTypeFilter,
}: ReportCardProps) {
  const router = useRouter();
  const [showCopyTooltip, setShowCopyTooltip] = useState(false);
  const [expandedDescription, setExpandedDescription] = useState(false);

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

  // Get component type from report category
  const componentType = report.category || 'inlets';

  const images = report.image ? [report.image] : [];

  const handleCopyId = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(report.id);
      setShowCopyTooltip(true);
      setTimeout(() => setShowCopyTooltip(false), 2000);
    } catch (err) {
      console.error('Failed to copy ID:', err);
    }
  };

  const handleCardClick = () => {
    if (report.componentId && report.category) {
      router.push(
        `/map?component=${report.componentId}&type=${report.category}`
      );
    } else {
      router.push(`/map?reportId=${report.id}`);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleCardClick();
        }
      }}
      className="group flex h-full max-h-100 w-full cursor-pointer flex-col overflow-hidden rounded-lg border border-[#ced1cd] bg-white text-left transition-all hover:bg-[#fafafa]"
    >
      {/* Image Gallery */}
      <div className="relative h-48 w-full overflow-hidden bg-gray-100">
        {images.length > 0 ? (
          <Image
            src={images[0]}
            alt={`Report ${report.id}`}
            fill
            className="object-cover transition-all group-hover:brightness-95"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            No image available
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Content */}
        <div className="max-h-38 space-y-3 overflow-y-auto p-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <div onClick={(e) => e.stopPropagation()}>
              <PriorityBadge
                priority={report.priority}
                size="sm"
                onClick={onPriorityFilter}
              />
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <StatusBadge
                status={report.status as 'pending' | 'in-progress' | 'resolved'}
                onClick={onStatusFilter}
              />
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <ComponentTypeBadge
                componentType={
                  componentType as
                    | 'inlets'
                    | 'outlets'
                    | 'storm_drains'
                    | 'man_pipes'
                }
                onClick={onComponentTypeFilter}
              />
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-2">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" />
            <p className="truncate text-xs text-gray-600">
              Location{' '}
              <span className="truncate font-semibold text-gray-900">
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
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedDescription(!expandedDescription);
                }}
                className={`cursor-pointer text-left text-xs text-gray-600 transition-all ${
                  expandedDescription ? '' : 'line-clamp-1'
                }`}
              >
                {report.description}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Date and Copy ID */}
      <div className="flex items-center justify-between border-t border-gray-200 px-4 py-1">
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
  );
}
