import PriorityBadge from './PriorityBadge';
import ImageGallery from './ImageGallery';
import {
  formatDateShort,
  formatComponentType,
  getStatusBadgeStyle,
} from '@/lib/dashboard/calculations';
import type { ReportWithMetadata } from '@/lib/dashboard/queries';
import { MapPin } from 'lucide-react';

interface ReportCardProps {
  report: ReportWithMetadata;
}

export default function ReportCard({ report }: ReportCardProps) {
  const statusStyle = getStatusBadgeStyle(
    report.status as 'pending' | 'in-progress' | 'resolved'
  );

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

  return (
    <div className="overflow-hidden rounded-lg border border-[#ced1cd] bg-white transition-shadow hover:shadow-lg">
      {/* Image Gallery */}
      <div className="bg-gray-50 p-4">
        <ImageGallery images={images} alt={`Report ${report.id}`} />
      </div>

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
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" />
          <div>
            <p className="line-clamp-2 text-sm font-medium text-gray-900">
              {report.address || 'Location not provided'}
            </p>
            {report.zone && (
              <p className="mt-1 text-xs text-gray-600">
                Zone: <span className="font-semibold">{report.zone}</span>
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {report.description && (
          <p className="line-clamp-2 text-sm text-gray-700">
            {report.description}
          </p>
        )}

        {/* Date */}
        <div className="border-t border-gray-200 pt-2">
          <p className="text-xs text-gray-600">
            Reported:{' '}
            <span className="font-medium">{formatDateShort(report.date)}</span>
          </p>
        </div>

        {/* Report ID */}
        <div className="font-mono text-xs text-gray-500">
          ID: {report.id.substring(0, 8)}...
        </div>
      </div>
    </div>
  );
}
