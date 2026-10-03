import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  acceptedImageType,
  fitWithin,
  ImageSanitizeError,
  IMAGE_ACCEPT_ATTRIBUTE,
  isHeic,
  sanitizeImage,
} from './sanitize-image';

const file = (name: string, type: string) =>
  new File([new Uint8Array([1, 2, 3])], name, { type });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('acceptedImageType', () => {
  it('accepts JPEG, PNG, WebP and HEIC/HEIF', () => {
    for (const type of [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ]) {
      expect(acceptedImageType({ name: 'x', type })).toBe(type);
    }
  });

  it('refuses SVG, GIF, AVIF and non-images', () => {
    for (const type of [
      'image/svg+xml',
      'image/gif',
      'image/avif',
      'text/html',
      'application/pdf',
    ]) {
      expect(acceptedImageType({ name: 'x.jpg', type })).toBeNull();
    }
  });

  it('falls back to the extension only when the browser gave no type', () => {
    expect(acceptedImageType({ name: 'IMG_1.HEIC', type: '' })).toBe(
      'image/heic'
    );
    expect(acceptedImageType({ name: 'a.svg', type: '' })).toBeNull();
    expect(acceptedImageType({ name: 'noext', type: '' })).toBeNull();
  });

  it('knows HEIC', () => {
    expect(isHeic({ name: 'a.heif', type: '' })).toBe(true);
    expect(isHeic({ name: 'a.jpg', type: 'image/jpeg' })).toBe(false);
  });

  it('builds an accept attribute without svg, gif or avif', () => {
    expect(IMAGE_ACCEPT_ATTRIBUTE).toContain('image/jpeg');
    expect(IMAGE_ACCEPT_ATTRIBUTE).not.toMatch(/svg|gif|avif|image\/\*/);
  });
});

describe('fitWithin', () => {
  it('leaves small images alone', () => {
    expect(fitWithin(1200, 800, 2560)).toEqual({ width: 1200, height: 800 });
  });

  it('scales the long edge down, keeping the aspect ratio', () => {
    expect(fitWithin(4032, 3024, 2560)).toEqual({ width: 2560, height: 1920 });
    expect(fitWithin(3024, 4032, 2560)).toEqual({ width: 1920, height: 2560 });
  });

  it('never returns a zero side', () => {
    expect(fitWithin(10000, 1, 100)).toEqual({ width: 100, height: 1 });
  });
});

describe('sanitizeImage', () => {
  function stubCanvas(bitmap: { width: number; height: number }) {
    const close = vi.fn();
    const createImageBitmap = vi.fn(async () => ({ ...bitmap, close }));
    const drawImage = vi.fn();
    const convertToBlob = vi.fn(
      async (opts: { type: string; quality: number }) =>
        new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: opts.type })
    );
    const sizes: [number, number][] = [];
    class FakeOffscreenCanvas {
      constructor(w: number, h: number) {
        sizes.push([w, h]);
      }
      getContext() {
        return { fillStyle: '', fillRect: vi.fn(), drawImage };
      }
      convertToBlob = convertToBlob;
    }
    vi.stubGlobal('createImageBitmap', createImageBitmap);
    vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);
    return { createImageBitmap, drawImage, convertToBlob, sizes, close };
  }

  it('re-encodes to a metadata-free JPEG, orientation applied, downscaled', async () => {
    const s = stubCanvas({ width: 4032, height: 3024 });
    const out = await sanitizeImage(file('IMG_1.png', 'image/png'));

    expect(s.createImageBitmap).toHaveBeenCalledWith(expect.any(File), {
      imageOrientation: 'from-image',
    });
    expect(s.sizes).toEqual([[2560, 1920]]);
    expect(s.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      2560,
      1920
    );
    expect(s.convertToBlob).toHaveBeenCalledWith({
      type: 'image/jpeg',
      quality: 0.85,
    });
    expect(s.close).toHaveBeenCalled();
    expect(out.type).toBe('image/jpeg');
    expect(out.name).toBe('photo.jpg');
  });

  it('refuses types outside the list before decoding', async () => {
    const s = stubCanvas({ width: 10, height: 10 });
    await expect(
      sanitizeImage(file('x.svg', 'image/svg+xml'))
    ).rejects.toBeInstanceOf(ImageSanitizeError);
    expect(s.createImageBitmap).not.toHaveBeenCalled();
  });

  it('rejects a HEIC the browser cannot decode, with a HEIC message', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => {
        throw new DOMException('decode failed', 'InvalidStateError');
      })
    );
    await expect(sanitizeImage(file('IMG_2.HEIC', ''))).rejects.toThrow(/HEIC/);
  });
});
