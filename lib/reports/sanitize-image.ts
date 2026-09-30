/**
 * Report photos go to a public bucket, and a phone photo carries EXIF: the
 * exact GPS position it was taken at, the device, the time. The app reads
 * what it needs from EXIF first (`extract-exif.ts`), then uploads a
 * re-encoded copy made here, which has no metadata at all. Re-encoding also
 * bakes in the EXIF orientation and scales very large photos down.
 */

/** Types the uploader accepts. The bucket allows the same (plus HEIF). */
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

/** For `<input accept>`. Extensions too: some browsers give HEIC no type. */
export const IMAGE_ACCEPT_ATTRIBUTE = [
  ...ACCEPTED_IMAGE_TYPES,
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
].join(',');

const ACCEPTED_EXTENSIONS: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

/** The longest side of an uploaded photo, in pixels. */
export const MAX_IMAGE_EDGE = 2560;
/** JPEG quality of the re-encoded photo. */
export const JPEG_QUALITY = 0.85;

type FileLike = Pick<File, 'name' | 'type'>;

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

/**
 * The file's image type if it is one we accept, else null. Goes by the
 * declared type, falling back to the extension only when the browser gave
 * none (Chrome on Windows does that for .heic). SVG, GIF, AVIF and the rest
 * are refused.
 */
export function acceptedImageType(file: FileLike): string | null {
  const type = file.type.toLowerCase();
  if (type) {
    return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type)
      ? type
      : null;
  }
  return ACCEPTED_EXTENSIONS[extensionOf(file.name)] ?? null;
}

export function isHeic(file: FileLike): boolean {
  const type = acceptedImageType(file);
  return type === 'image/heic' || type === 'image/heif';
}

/**
 * Size that fits within `maxEdge` on its longest side, keeping the aspect
 * ratio. Never scales up.
 */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number = MAX_IMAGE_EDGE
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** A photo that can't be used, with a message meant for the reporter. */
export class ImageSanitizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageSanitizeError';
  }
}

const UNREADABLE_HEIC =
  'This browser cannot read HEIC photos. Set your camera to "Most Compatible" (JPEG), or choose the photo again from a browser that can open HEIC, such as Safari.';
const UNREADABLE_IMAGE =
  'This photo could not be read. Please choose a JPEG, PNG or WebP image.';

/**
 * Decodes the photo, applying its EXIF orientation. Throws an
 * ImageSanitizeError when the browser cannot decode it (HEIC outside
 * Safari, a corrupt file).
 */
export async function decodeImage(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ImageSanitizeError(
      isHeic(file) ? UNREADABLE_HEIC : UNREADABLE_IMAGE
    );
  }
}

async function encodeJpeg(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number
): Promise<Blob> {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new ImageSanitizeError(UNREADABLE_IMAGE);
    // JPEG has no transparency; a transparent PNG would otherwise turn black.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    return canvas.convertToBlob({ type: 'image/jpeg', quality });
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageSanitizeError(UNREADABLE_IMAGE);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new ImageSanitizeError(UNREADABLE_IMAGE)),
      'image/jpeg',
      quality
    )
  );
}

/**
 * A metadata-free JPEG copy of the photo, at most `maxEdge` px on its long
 * side. Read EXIF from the original before calling this: the copy has none.
 */
export async function sanitizeImage(
  file: File,
  { maxEdge = MAX_IMAGE_EDGE, quality = JPEG_QUALITY } = {}
): Promise<File> {
  if (!acceptedImageType(file)) {
    throw new ImageSanitizeError(
      'Only JPEG, PNG, WebP or HEIC photos can be uploaded.'
    );
  }

  const bitmap = await decodeImage(file);
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);
    const blob = await encodeJpeg(bitmap, width, height, quality);
    return new File([blob], 'photo.jpg', {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}
