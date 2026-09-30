import ExifReader from 'exifreader';

export interface ExifData {
  latitude: number | null;
  longitude: number | null;
  date: Date | null;
}

/**
 * The earliest year a photo's timestamp is believed. A camera whose clock
 * was never set writes "0000:00:00 00:00:00", which parses to 1899.
 */
const EARLIEST_PLAUSIBLE_YEAR = 2000;

/**
 * Parse an EXIF "YYYY:MM:DD HH:MM[:SS]" timestamp, as local time since EXIF
 * carries no zone. Null for anything that is not a real date: the old
 * parser turned a missing seconds field into an Invalid Date, which is
 * truthy and compares false against everything, so it passed age checks.
 */
export function parseExifDateTime(value: string): Date | null {
  const match = value
    .trim()
    .match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;

  const [year, month, day, hour, minute, second = 0] = match
    .slice(1)
    .map((part) => (part === undefined ? 0 : Number(part)));
  if (year < EARLIEST_PLAUSIBLE_YEAR) return null;

  const date = new Date(year, month - 1, day, hour, minute, second);
  // Date rolls an out-of-range field over (month 13 is next January), so
  // a date that does not read back the same was not a real one.
  if (
    Number.isNaN(date.getTime()) ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    return null;
  }
  return date;
}

export async function extractExifLocation(file: File): Promise<ExifData> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const tags: Record<string, unknown> = await ExifReader.load(arrayBuffer);

    const lat = tags.GPSLatitude;
    const lon = tags.GPSLongitude;
    const latRef = tags.GPSLatitudeRef;
    const lonRef = tags.GPSLongitudeRef;

    // Extract date
    let date: Date | null = null;
    const dateTimeOriginal = tags.DateTimeOriginal;

    if (dateTimeOriginal) {
      const dateStr = (dateTimeOriginal as { description?: string })
        .description;
      if (dateStr) date = parseExifDateTime(dateStr);
    }

    if (lat && lon && latRef && lonRef) {
      let latitude = (lat as { description?: string }).description
        ? parseFloat((lat as { description: string }).description)
        : null;
      let longitude = (lon as { description?: string }).description
        ? parseFloat((lon as { description: string }).description)
        : null;

      if (latitude !== null && longitude !== null) {
        // Apply hemisphere corrections
        if (
          (latRef as { value?: string[] }).value &&
          (latRef as { value: string[] }).value[0] === 'S'
        ) {
          latitude = -latitude;
        }
        if (
          (lonRef as { value?: string[] }).value &&
          (lonRef as { value: string[] }).value[0] === 'W'
        ) {
          longitude = -longitude;
        }

        return { latitude, longitude, date };
      }
    }

    return { latitude: null, longitude: null, date };
  } catch (_error) {
    return { latitude: null, longitude: null, date: null };
  }
}
