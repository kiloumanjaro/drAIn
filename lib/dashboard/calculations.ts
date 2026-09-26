/**
 * Format number of days to human readable string
 * e.g., 1.5 days -> "1.5 days"
 */
export function formatDays(days: number): string {
  if (days === 0) return '0 days';
  if (days === 1) return '1 day';
  return `${days} days`;
}

/**
 * Calculate percentage distribution of component types
 */
export function calculateComponentTypePercentage(
  data: Array<{ type: string; count: number }>
): Array<{ type: string; count: number; percentage: number }> {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return data.map((item) => ({
    ...item,
    percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
  }));
}

/**
 * Format component type for display
 */
export function formatComponentType(
  type: 'inlets' | 'outlets' | 'storm_drains' | 'man_pipes'
): string {
  const map: Record<string, string> = {
    inlets: 'Inlets',
    outlets: 'Outlets',
    storm_drains: 'Drains',
    man_pipes: 'Pipes',
  };
  return map[type] || 'Unknown';
}

/**
 * Get color for priority level
 */
export function getPriorityColor(
  priority: 'low' | 'medium' | 'high' | 'critical'
): string {
  const colors: Record<string, string> = {
    low: 'text-gray-500',
    medium: 'text-yellow-600',
    high: 'text-orange-600',
    critical: 'text-red-600',
  };
  return colors[priority] || 'text-gray-500';
}

/**
 * Get background color for priority level
 */
export function getPriorityBgColor(
  priority: 'low' | 'medium' | 'high' | 'critical'
): string {
  const colors: Record<string, string> = {
    low: 'bg-gray-100',
    medium: 'bg-yellow-50',
    high: 'bg-orange-50',
    critical: 'bg-red-50',
  };
  return colors[priority] || 'bg-gray-100';
}

/**
 * Get status badge styling
 */
export function getStatusBadgeStyle(
  status: 'pending' | 'in-progress' | 'resolved'
): {
  bgColor: string;
  textColor: string;
  label: string;
} {
  const styles: Record<
    string,
    { bgColor: string; textColor: string; label: string }
  > = {
    pending: {
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-800',
      label: 'Pending',
    },
    'in-progress': {
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      label: 'In Progress',
    },
    resolved: {
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      label: 'Resolved',
    },
  };
  return styles[status] || styles.pending;
}

/**
 * Format date for display
 */
export function formatDate(dateString: string | Date): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format date short (without time)
 */
export function formatDateShort(dateString: string | Date): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
