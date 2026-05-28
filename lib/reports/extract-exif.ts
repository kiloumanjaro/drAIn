import ExifReader from 'exifreader';

export interface ExifData {
  latitude: number | null;
  longitude: number | null;
  date: Date | null;
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
      // EXIF date format is usually "YYYY:MM:DD HH:MM:SS"
      const dateStr = (dateTimeOriginal as { description?: string })
        .description;
      if (dateStr) {
        const [datePart, timePart] = dateStr.split(' ');
        if (datePart && timePart) {
          const [year, month, day] = datePart.split(':');
          const [hour, minute, second] = timePart.split(':');
          date = new Date(
            parseInt(year),
            parseInt(month) - 1, // Month is 0-indexed
            parseInt(day),
            parseInt(hour),
            parseInt(minute),
            parseInt(second)
          );
        }
      }
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
