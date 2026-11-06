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
