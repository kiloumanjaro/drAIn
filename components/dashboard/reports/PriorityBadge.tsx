import { getPriorityColor } from "@/lib/dashboard/calculations";

interface PriorityBadgeProps {
  priority: "low" | "medium" | "high" | "critical";
  size?: "sm" | "md" | "lg";
}

const getPriorityIcon = (priority: string): string => {
  switch (priority) {
    case "critical":
      return "🔴";
    case "high":
      return "🟠";
    case "medium":
      return "🟡";
    case "low":
      return "⚪";
    default:
      return "⚪";
  }
};

const getPriorityLabel = (priority: string): string => {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
};

export default function PriorityBadge({
  priority,
  size = "md",
}: PriorityBadgeProps) {
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const colorClass = getPriorityColor(priority);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${sizeClasses[size]} ${colorClass}`}
    >
      <span>{getPriorityIcon(priority)}</span>
      <span>{getPriorityLabel(priority)}</span>
    </span>
  );
}
