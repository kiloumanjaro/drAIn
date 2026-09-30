'use client';

// Mock auth provider for the portable bundle. Supplies a demo logged-in session
// so the profile/admin views render populated. Swap in your real auth here.

import { createContext, useContext } from 'react';
import type { Session, User } from '@/lib/supabase/types';
import type { Profile } from '@/lib/supabase/profile';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
};

const DEMO_USER: User = {
  id: 'demo-user',
  email: 'demo@example.com',
};

const DEMO_SESSION: Session = {
  user: DEMO_USER,
  access_token: 'demo-token',
};

const DEMO_PROFILE: Profile = {
  id: 'demo-user',
  full_name: 'Demo User',
  avatar_url: '',
  role: 'admin',
};

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // Static demo auth state — no Supabase, no network.
  const value: AuthContextType = {
    user: DEMO_USER,
    session: DEMO_SESSION,
    loading: false,
    profile: DEMO_PROFILE,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
