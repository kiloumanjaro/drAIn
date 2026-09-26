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

/**
 * Shape of a maintenance-history row returned by getMaintenanceHistory.
 * `last_cleaned_at` is `maintenance.performed_at`, aliased in the query.
 */
export type HistoryItem = {
  last_cleaned_at: string;
  agencies: { name: string }[] | null;
  profiles: { full_name: string }[] | null;
  status: string | null;
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
 * What a photo check concluded.
 *
 * The distinction that matters is between evidence a photo is wrong and an
 * absence of evidence either way. EXIF is trivially editable, so the check
 * never stopped anyone determined to fake a submission. What it did stop
 * was honest ones: iOS strips location when a photo is shared, and most
 * messaging apps strip EXIF outright, so a worker who photographs a cleaned
 * drain and sends it to a colleague to upload arrives with nothing to check.
 *
 * So a photo is only rejected when its own metadata contradicts the claim.
 * When there is nothing to check, the submission goes through and is marked
 * as unverified.
 */
export type PhotoCheckOutcome = 'verified' | 'unverifiable' | 'rejected';

export interface PhotoCheck {
  outcome: PhotoCheckOutcome;
  /** Why, in words meant for the submitter. Empty when verified. */
  reason: string;
}

const VERIFIED: PhotoCheck = { outcome: 'verified', reason: '' };

const unverifiable = (reason: string): PhotoCheck => ({
  outcome: 'unverifiable',
  reason,
});

const rejected = (reason: string): PhotoCheck => ({
  outcome: 'rejected',
  reason,
});

/**
 * Check a maintenance photo against the asset it claims to show.
 *
 * `assetCoordinates` is every point the photo may be measured against: one
 * for a node, the whole run for a pipe, since a photo anywhere along a pipe
 * is valid evidence for it.
 */
export function checkMaintenancePhoto(
  exif: PhotoExif,
  assetCoordinates: readonly [number, number][],
  measureDistanceM: (from: [number, number], to: [number, number]) => number,
  now: Date = new Date()
): PhotoCheck {
  // The time and the place are checked independently. A missing timestamp
  // used to end the check before the distance was looked at, so a photo
  // taken 5 km away passed as merely unverified.
  const findings = [
    checkPhotoAge(exif.date, now),
    checkPhotoPlace(exif, assetCoordinates, measureDistanceM),
  ];

  // Evidence of a problem outranks absence of evidence.
  const rejections = findings.filter((f) => f?.outcome === 'rejected');
  if (rejections.length > 0) {
    return rejected(rejections.map((f) => f!.reason).join(' '));
  }

  const gaps = findings.filter((f) => f?.outcome === 'unverifiable');
  if (gaps.length > 0) {
    return unverifiable(
      gaps.map((f) => f!.reason).join(' ') +
        ' It will be submitted and marked unverified.'
    );
  }

  return VERIFIED;
}

/**
 * A timestamp worth checking: a real date, and not the EXIF zero date
 * ("0000:00:00") that a camera with an unset clock writes, which parses
 * to 1899.
 */
function isUsablePhotoDate(date: Date | null | undefined): date is Date {
  return (
    date instanceof Date &&
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() >= 2000
  );
}

/** Null when the photo's age is fine. */
function checkPhotoAge(
  date: Date | null | undefined,
  now: Date
): PhotoCheck | null {
  if (!isUsablePhotoDate(date)) {
    return unverifiable(
      'This image carries no timestamp, so the time it was taken could not ' +
        'be confirmed.'
    );
  }

  const hoursOld = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  if (hoursOld > MAINTENANCE_PHOTO_MAX_AGE_HOURS) {
    return rejected(
      `This image was taken ${Math.round(hoursOld)} hours ago. Evidence must ` +
        `be from within the last ${MAINTENANCE_PHOTO_MAX_AGE_HOURS} hours.`
    );
  }
  if (hoursOld < 0) {
    return rejected(
      'This image is dated in the future. Check the device date and retake it.'
    );
  }
  return null;
}

/** Null when the photo was taken close enough to the asset. */
function checkPhotoPlace(
  exif: PhotoExif,
  assetCoordinates: readonly [number, number][],
  measureDistanceM: (from: [number, number], to: [number, number]) => number
): PhotoCheck | null {
  const { latitude, longitude } = exif;
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return unverifiable(
      'This image carries no location, so it could not be matched to the ' +
        'selected asset.'
    );
  }

  if (assetCoordinates.length === 0) {
    // Our gap, not the submitter's.
    return unverifiable(
      'The selected asset has no recorded location, so the image could not ' +
        'be matched to it.'
    );
  }

  const from: [number, number] = [longitude, latitude];
  const nearest = Math.min(
    ...assetCoordinates.map((to) => measureDistanceM(from, to))
  );

  if (nearest > MAINTENANCE_PHOTO_MAX_DISTANCE_M) {
    return rejected(
      `This image was taken ${nearest.toFixed(0)} m from the selected asset. ` +
        `Evidence must be from within ${MAINTENANCE_PHOTO_MAX_DISTANCE_M} m.`
    );
  }
  return null;
}

/** Note appended to a record whose photo could not be checked. */
export function unverifiedNote(reason: string): string {
  return `[evidence unverified: ${reason}]`;
}
