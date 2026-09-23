// Mock of the EXIF extractor for the portable bundle.
// Original used `exifreader`; this returns nulls so report image uploads still
// flow through the UI without the dependency.

export interface ExifData {
  latitude: number | null;
  longitude: number | null;
  date: Date | null;
}

export async function extractExifLocation(_file: File): Promise<ExifData> {
  return { latitude: null, longitude: null, date: null };
}
