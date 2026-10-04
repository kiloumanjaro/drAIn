import { describe, expect, it } from 'vitest';
import { avatarPublicUrl, sweepLegacyProfileKeys } from './profile-cache';

const USER_ID = '11111111-2222-3333-4444-555555555555';
const OTHER_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

/** Stands in for the Supabase client's storage, recording what was asked. */
function fakeSource() {
  const asked: Array<[bucket: string, path: string]> = [];
  return {
    asked,
    storage: {
      from: (bucket: string) => ({
        getPublicUrl: (path: string) => {
          asked.push([bucket, path]);
          return {
            data: {
              publicUrl: `http://storage.test/object/public/${bucket}/${path}`,
            },
          };
        },
      }),
    },
  };
}

describe('avatarPublicUrl', () => {
  it('builds the URL from the stored path in the Avatars bucket', () => {
    const source = fakeSource();

    expect(avatarPublicUrl(source, `${USER_ID}/avatar.jpg`)).toBe(
      `http://storage.test/object/public/Avatars/${USER_ID}/avatar.jpg`
    );
    expect(source.asked).toEqual([['Avatars', `${USER_ID}/avatar.jpg`]]);
  });

  it('has no URL for a profile without an avatar', () => {
    const source = fakeSource();

    expect(avatarPublicUrl(source, null)).toBeNull();
    expect(avatarPublicUrl(source, undefined)).toBeNull();
    expect(avatarPublicUrl(source, '')).toBeNull();
    expect(source.asked).toEqual([]);
  });

  it('changes the URL when the profile is saved again', () => {
    // A new upload overwrites the same file, so only the version differs.
    const source = fakeSource();
    const path = `${USER_ID}/avatar.jpg`;

    const before = avatarPublicUrl(source, path, '2026-10-01T08:00:00Z');
    const after = avatarPublicUrl(source, path, '2026-10-01T08:00:05Z');

    expect(before).toBe(
      `http://storage.test/object/public/Avatars/${path}?v=${Date.parse('2026-10-01T08:00:00Z')}`
    );
    expect(after).not.toBe(before);
  });

  it('leaves the version off when it is not a date', () => {
    const source = fakeSource();
    const path = `${USER_ID}/avatar.jpg`;

    expect(avatarPublicUrl(source, path, 'not a date')).toBe(
      `http://storage.test/object/public/Avatars/${path}`
    );
    expect(avatarPublicUrl(source, path, null)).toBe(
      `http://storage.test/object/public/Avatars/${path}`
    );
  });
});

/** A Storage with only what the sweep uses, backed by a Map. */
function fakeStorage(entries: Record<string, string>) {
  const items = new Map(Object.entries(entries));
  return {
    items,
    get length() {
      return items.size;
    },
    key: (index: number) => [...items.keys()][index] ?? null,
    removeItem: (key: string) => {
      items.delete(key);
    },
  };
}

describe('sweepLegacyProfileKeys', () => {
  it('removes every cached profile, whoever it belonged to', () => {
    const storage = fakeStorage({
      [`profile-${USER_ID}`]: '{"profile":{"full_name":"Juan"}}',
      'sb-local-auth-token': 'session',
      [`profile-${OTHER_ID}`]: '{"profile":{"full_name":"Maria"}}',
    });

    expect(sweepLegacyProfileKeys(storage)).toBe(2);
    expect([...storage.items.keys()]).toEqual(['sb-local-auth-token']);
  });

  it('removes neighbouring keys without skipping one', () => {
    const storage = fakeStorage({
      [`profile-${USER_ID}`]: '{}',
      [`profile-${OTHER_ID}`]: '{}',
    });

    expect(sweepLegacyProfileKeys(storage)).toBe(2);
    expect(storage.items.size).toBe(0);
  });

  it('leaves keys that only look similar', () => {
    const storage = fakeStorage({
      'profile-panel-position': '{"x":1,"y":2}',
      [`my-profile-${USER_ID}`]: '{}',
      [`profile-${USER_ID}-draft`]: '{}',
    });

    expect(sweepLegacyProfileKeys(storage)).toBe(0);
    expect(storage.items.size).toBe(3);
  });

  it('does nothing on empty storage', () => {
    expect(sweepLegacyProfileKeys(fakeStorage({}))).toBe(0);
  });
});
