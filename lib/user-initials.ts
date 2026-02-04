export function getInitials(name: string | null | undefined): string {
  if (!name || !name.trim()) return 'NA';

  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();

  const first = parts[0][0]?.toUpperCase() ?? '';
  const last = parts[parts.length - 1][0]?.toUpperCase() ?? '';

  return first + last;
}
