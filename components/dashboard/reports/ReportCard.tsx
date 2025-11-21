import PriorityBadge from "./PriorityBadge";
import ImageGallery from "./ImageGallery";
import { formatDateShort, formatComponentType, getStatusBadgeStyle } from "@/lib/dashboard/calculations";
import type { ReportWithMetadata } from "@/lib/dashboard/queries";
import { MapPin } from "lucide-react";

interface ReportCardProps {
  report: ReportWithMetadata;
}

export default function ReportCard({ report }: ReportCardProps) {
  const statusStyle = getStatusBadgeStyle(
    report.status as "pending" | "in-progress" | "resolved"
  );

  // Determine component type from component_id
  const componentType = (() => {
    if (!report.componentId) return "inlets";
    const lower = report.componentId.toLowerCase();
    if (lower.includes("inlet")) return "inlets";
    if (lower.includes("outlet")) return "outlets";
    if (lower.includes("drain")) return "storm_drains";
    if (lower.includes("pipe")) return "man_pipes";
    return "inlets";
  })();

  const images = report.image ? [report.image] : [];

  return (
    <div className="bg-white rounded-lg border border-[#ced1cd] overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image Gallery */}
      <div className="p-4 bg-gray-50">
        <ImageGallery images={images} alt={`Report ${report.id}`} />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <PriorityBadge priority={report.priority} size="sm" />
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${statusStyle.bgColor} ${statusStyle.textColor}`}
          >
            {statusStyle.label}
          </span>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800">
            {formatComponentType(componentType as any)}
          </span>
        </div>

        {/* Location */}
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-900 line-clamp-2">
              {report.address || "Location not provided"}
            </p>
            {report.zone && (
              <p className="text-xs text-gray-600 mt-1">
                Zone: <span className="font-semibold">{report.zone}</span>
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {report.description && (
          <p className="text-sm text-gray-700 line-clamp-2">
            {report.description}
          </p>
        )}

        {/* Date */}
        <div className="pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            Reported: <span className="font-medium">{formatDateShort(report.date)}</span>
          </p>
        </div>

        {/* Report ID */}
        <div className="text-xs text-gray-500 font-mono">
          ID: {report.id.substring(0, 8)}...
        </div>
      </div>
    </div>
  );
}
