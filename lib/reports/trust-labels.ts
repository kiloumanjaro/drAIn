/**
 * Plain-language labels for the trust signals on a report. Kept free of
 * Supabase imports so they can be unit tested.
 */
import type { PhotoLocationCheck, ReportReview } from '@/lib/supabase/enums';

export type Tone = 'good' | 'warn' | 'bad' | 'neutral';

export interface TrustLabel {
  text: string;
  tone: Tone;
}

/** A photo older than this, when the report was filed, is worth a note. */
export const STALE_PHOTO_DAYS = 2;

function formatDistance(metres: number): string {
  return metres < 1000
    ? `${Math.round(metres)} m`
    : `${(metres / 1000).toFixed(1)} km`;
}

/**
 * Where the photo says it was taken, against the component. EXIF can be
 * edited, so even a match is worded as what the photo says, not as fact.
 */
export function photoLocationLabel(
  check: PhotoLocationCheck,
  distanceM: number | null
): TrustLabel {
  switch (check) {
    case 'match':
      return {
        text:
          distanceM === null
            ? 'Photo location matches'
            : `Photo taken ${formatDistance(distanceM)} from it`,
        tone: 'good',
      };
    case 'mismatch':
      return {
        text:
          distanceM === null
            ? 'Photo taken elsewhere'
            : `Photo taken ${formatDistance(distanceM)} away`,
        tone: 'bad',
      };
    default:
      return { text: 'No location in photo', tone: 'neutral' };
  }
}

/**
 * How long before the report the photo was taken, when that is long enough
 * to matter; null otherwise (or when the photo carried no date).
 */
export function photoAgeLabel(
  photoTakenAt: string | null,
  reportedAt: string
): TrustLabel | null {
  if (!photoTakenAt) return null;
  const taken = new Date(photoTakenAt).getTime();
  const reported = new Date(reportedAt).getTime();
  if (Number.isNaN(taken) || Number.isNaN(reported)) return null;

  const days = (reported - taken) / (24 * 60 * 60 * 1000);
  if (days < -1) return { text: 'Photo dated after the report', tone: 'bad' };
  if (days < STALE_PHOTO_DAYS) return null;
  return {
    text: `Photo taken ${Math.round(days)} days before the report`,
    tone: 'warn',
  };
}

/**
 * What staff made of the report. `reasonOnly` is for a label shown beside
 * something that already says "Rejected", so the word is not read twice.
 */
export function reviewLabel(
  status: ReportReview,
  note: string | null,
  { reasonOnly = false }: { reasonOnly?: boolean } = {}
): TrustLabel {
  switch (status) {
    case 'confirmed':
      return { text: 'Confirmed by staff', tone: 'good' };
    case 'rejected':
      if (reasonOnly) {
        return { text: note || 'No reason given', tone: 'bad' };
      }
      return {
        text: note ? `Rejected: ${note}` : 'Rejected by staff',
        tone: 'bad',
      };
    default:
      return { text: 'Not reviewed yet', tone: 'neutral' };
  }
}

export const TONE_CLASSES: Record<Tone, string> = {
  good: 'border-green-500/20 bg-green-500/10 text-green-700',
  warn: 'border-amber-500/20 bg-amber-500/10 text-amber-700',
  bad: 'border-red-500/20 bg-red-500/10 text-red-700',
  neutral: 'border-gray-500/20 bg-gray-500/10 text-gray-600',
};
