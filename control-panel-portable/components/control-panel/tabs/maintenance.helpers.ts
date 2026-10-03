/**
 * Pure helpers + constants for the Maintenance tab.
 *
 * Deliberately free of Supabase / network imports so this module can be
 * loaded from unit tests without environment variables. The Supabase-coupled
 * `assetActions` map lives in {@link ./maintenance.actions} instead.
 */

/**
 * Set to `true` to bypass EXIF/location validation when submitting a
 * maintenance photo. Used during local development only.
 */
export const DEBUG_MODE = false;

/** Maximum age (hours) for a maintenance evidence photo. */
export const MAINTENANCE_PHOTO_MAX_AGE_HOURS = 12;

/** Shape of a maintenance-history row returned by Supabase. */
export type HistoryItem = {
  last_cleaned_at: string;
  agencies: { name: string }[] | null;
  profiles: { full_name: string }[] | null;
  status: string | null;
  addressed_report_id: string | null;
  description: string | null;
  evidence_image: string | null;
};

/**
 * Returns the Tailwind class string used to badge a maintenance status row
 * (`resolved`, `in-progress`, anything else / null).
 */
export function getStatusStyles(status: string | null): string {
  switch (status) {
    case 'resolved':
      return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
    case 'in-progress':
      return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
    default:
      return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
  }
}
