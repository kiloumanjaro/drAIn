/**
 * The parts of the signed-in profile that need neither the network nor the
 * Supabase client: where an avatar is served from, and clearing what older
 * versions of the app left in localStorage.
 */

type PublicUrlSource = {
  storage: {
    from: (bucket: string) => {
      getPublicUrl: (path: string) => { data: { publicUrl: string } };
    };
  };
};

/**
 * Public URL of an avatar from the storage path kept in `profiles.avatar_url`.
 *
 * Every avatar is stored as `<user id>/avatar.jpg`, so a new upload keeps the
 * same URL and the browser would go on showing the old picture. `version`
 * (the profile's `updated_at`) is added as a query the storage server ignores,
 * which makes the URL change whenever the profile is saved.
 */
export function avatarPublicUrl(
  source: PublicUrlSource,
  path: string | null | undefined,
  version?: string | null
): string | null {
  if (!path) return null;
  const { publicUrl } = source.storage.from('Avatars').getPublicUrl(path).data;
  if (!version) return publicUrl;
  const stamp = Date.parse(version);
  return Number.isNaN(stamp) ? publicUrl : `${publicUrl}?v=${stamp}`;
}

/** `profile-<user id>`: where the profile used to be cached in localStorage. */
const LEGACY_PROFILE_KEY =
  /^profile-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Removes every cached profile an older version of the app left behind (name,
 * role and agency of whoever signed in on this device). Returns how many keys
 * it removed.
 */
export function sweepLegacyProfileKeys(
  storage: Pick<Storage, 'length' | 'key' | 'removeItem'>
): number {
  // Collected first: removing a key shifts the index of those after it.
  const stale: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && LEGACY_PROFILE_KEY.test(key)) stale.push(key);
  }
  for (const key of stale) storage.removeItem(key);
  return stale.length;
}
