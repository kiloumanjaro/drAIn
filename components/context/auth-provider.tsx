'use client';

import { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import client from '@/lib/supabase/client';
import { Profile } from '@/lib/supabase/profile';
import { avatarPublicUrl } from '@/lib/supabase/profile-cache';
import { useProfile } from '@/lib/query/hooks/use-profile';
import { profileKeys } from '@/lib/query/keys';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  /** True until the session is known and, when signed in, its profile too. */
  loading: boolean;
  profile: Profile | null;
  /** Where the profile's avatar is served from; null when it has none. */
  publicAvatarUrl: string | null;
};

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const userId = user?.id;
  const { data: fetchedProfile, isPending: profilePending } =
    useProfile(userId);
  const profile = (userId && fetchedProfile) || null;
  const loading = sessionLoading || (!!userId && profilePending);

  useEffect(() => {
    const fetchAuthData = async () => {
      setSessionLoading(true);
      const {
        data: { session },
        error,
      } = await client.auth.getSession();

      if (error) {
        console.error('Error fetching session:', error.message);
        setSessionLoading(false);
        return;
      }

      setUser(session?.user ?? null);
      setSession(session);
      setSessionLoading(false);
    };

    fetchAuthData();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setSession(session);
      // A role or agency can change on the server (an admin promotes or
      // removes a member), so each later auth event, such as a token refresh
      // or the tab regaining focus, reloads the profile behind what is shown.
      // The first event only repeats getSession above.
      if (currentUser && event !== 'INITIAL_SESSION') {
        queryClient.invalidateQueries({
          queryKey: profileKeys.detail(currentUser.id),
        });
      }
      setSessionLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const publicAvatarUrl = useMemo(
    () => avatarPublicUrl(client, profile?.avatar_url, profile?.updated_at),
    [profile?.avatar_url, profile?.updated_at]
  );

  return (
    <AuthContext.Provider
      value={{ user, session, loading, profile, publicAvatarUrl }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
