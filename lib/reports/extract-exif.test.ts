import { beforeEach, describe, expect, it, vi } from 'vitest';

const load = vi.hoisted(() => vi.fn());
vi.mock('exifreader', () => ({ default: { load } }));

import { extractExifLocation, parseExifDateTime } from './extract-exif';

const photo = () => new File([new Uint8Array([0xff, 0xd8])], 'photo.jpg');

/** Tags shaped the way ExifReader returns them. */
function gpsTags(latRef: string, lonRef: string) {
  return {
    GPSLatitude: { description: '10.32' },
    GPSLongitude: { description: '123.95' },
    GPSLatitudeRef: { value: [latRef] },
    GPSLongitudeRef: { value: [lonRef] },
  };
}

beforeEach(() => {
  load.mockReset();
});

describe('parseExifDateTime', () => {
  it('reads the EXIF "YYYY:MM:DD HH:MM:SS" format as local time', () => {
    expect(parseExifDateTime('2026:01:15 08:30:05')).toEqual(
      new Date(2026, 0, 15, 8, 30, 5)
    );
  });

  it('reads a timestamp with no seconds', () => {
    // parseInt(undefined) used to make this an Invalid Date, which is
    // truthy and so passed every age check.
    expect(parseExifDateTime('2026:01:15 08:30')).toEqual(
      new Date(2026, 0, 15, 8, 30, 0)
    );
  });

  it.each([
    ['the zero date an unset camera clock writes', '0000:00:00 00:00:00'],
    ['a blank date', '    :  :     :  :  '],
    ['a date with no time', '2026:01:15'],
    ['an impossible month', '2026:13:01 00:00:00'],
    ['text', 'yesterday'],
    ['a year before digital cameras', '1970:01:01 00:00:00'],
  ])('returns null for %s', (_case, value) => {
    expect(parseExifDateTime(value)).toBeNull();
  });
});

describe('extractExifLocation', () => {
  it.each([
    ['N', 'E', 10.32, 123.95],
    ['S', 'E', -10.32, 123.95],
    ['N', 'W', 10.32, -123.95],
    ['S', 'W', -10.32, -123.95],
  ])(
    'signs a %s/%s position by its hemisphere',
    async (latRef, lonRef, latitude, longitude) => {
      load.mockResolvedValue(gpsTags(latRef, lonRef));
      await expect(extractExifLocation(photo())).resolves.toMatchObject({
        latitude,
        longitude,
      });
    }
  );

  it('reads the date the photo was taken', async () => {
    load.mockResolvedValue({
      DateTimeOriginal: { description: '2026:01:15 08:30:05' },
    });
    const { date } = await extractExifLocation(photo());
    expect(date).toEqual(new Date(2026, 0, 15, 8, 30, 5));
  });

  it('reports no date for the zero date', async () => {
    load.mockResolvedValue({
      DateTimeOriginal: { description: '0000:00:00 00:00:00' },
    });
    const { date } = await extractExifLocation(photo());
    expect(date).toBeNull();
  });

  it('reports nothing when the file cannot be read', async () => {
    load.mockRejectedValue(new Error('not an image'));
    await expect(extractExifLocation(photo())).resolves.toEqual({
      latitude: null,
      longitude: null,
      date: null,
    });
  });
});
