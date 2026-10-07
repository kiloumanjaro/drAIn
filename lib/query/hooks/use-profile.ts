import { useQuery } from '@tanstack/react-query';
import { getProfile } from '@/lib/supabase/profile';
import type { Profile } from '@/lib/supabase/profile';
import { profileKeys } from '@/lib/query/keys';

/**
 * The signed-in user's profile. AuthProvider is its one reader (use `useAuth`
 * everywhere else); after a save, write the new profile to this key instead of
 * keeping a copy.
 */
export function useProfile(userId: string | undefined) {
  return useQuery<Profile | null>({
    queryKey: profileKeys.detail(userId ?? ''),
    queryFn: () => (userId ? getProfile(userId) : null),
    enabled: !!userId,
  });
}
