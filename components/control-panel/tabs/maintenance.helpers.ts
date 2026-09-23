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

/** How close to the asset the photo must have been taken, in metres. */
export const MAINTENANCE_PHOTO_MAX_DISTANCE_M = 50;

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

/** The location and timestamp read out of a photo's EXIF block. */
export interface PhotoExif {
  date?: Date | null;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Check that a maintenance photo was taken recently and near the asset.
 *
 * Returns an error message describing the first failed check, or `null` if
 * the photo is acceptable. `assetCoordinates` is every point the photo may
 * be measured against: one for a node, the whole run for a pipe, since a
 * photo anywhere along a pipe is valid evidence for it.
 */
export function validateMaintenancePhoto(
  exif: PhotoExif,
  assetCoordinates: readonly [number, number][],
  measureDistanceM: (from: [number, number], to: [number, number]) => number,
  now: Date = new Date()
): string | null {
  if (!exif.date) {
    return 'Could not retrieve date from image. Ensure the image has EXIF data.';
  }

  const hoursOld = (now.getTime() - exif.date.getTime()) / (1000 * 60 * 60);
  if (hoursOld > MAINTENANCE_PHOTO_MAX_AGE_HOURS) {
    return `Image is too old. Must be taken within ${MAINTENANCE_PHOTO_MAX_AGE_HOURS} hours.`;
  }
  if (hoursOld < 0) {
    return 'Image appears to be from the future. Check device settings.';
  }

  if (
    exif.latitude === null ||
    exif.latitude === undefined ||
    exif.longitude === null ||
    exif.longitude === undefined
  ) {
    return 'Could not retrieve coordinates from image.';
  }

  if (assetCoordinates.length === 0) {
    return 'Could not determine asset location.';
  }

  const from: [number, number] = [exif.longitude, exif.latitude];
  const distances = assetCoordinates.map((to) => measureDistanceM(from, to));
  const nearest = Math.min(...distances);

  if (nearest > MAINTENANCE_PHOTO_MAX_DISTANCE_M) {
    return (
      `Image location is too far from the selected asset ` +
      `(${nearest.toFixed(0)}m). Must be within ${MAINTENANCE_PHOTO_MAX_DISTANCE_M}m.`
    );
  }

  return null;
}
