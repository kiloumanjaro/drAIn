import type { QueryClient } from '@tanstack/react-query';
import client from '@/lib/supabase/client';
import { profileKeys } from '@/lib/query/keys';
import { sweepLegacyProfileKeys } from '@/lib/supabase/profile-cache';

/**
 * Signs out and leaves nothing of the profile on the device: not in the query
 * cache, and not in the localStorage keys older versions of the app wrote.
 */
export async function signOutAndForgetProfile(
  queryClient: QueryClient
): Promise<void> {
  try {
    await client.auth.signOut();
  } finally {
    queryClient.removeQueries({ queryKey: profileKeys.all });
    try {
      sweepLegacyProfileKeys(window.localStorage);
    } catch {
      // Storage can be blocked (private mode, site settings); nothing to clear.
    }
  }
}
