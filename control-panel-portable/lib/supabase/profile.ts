// Mock of the profile data layer for the portable bundle.
// Same export surface as the original; returns static demo data / no-ops.

import type { Session } from '@/lib/supabase/types';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  role: string;
}

const DEMO_PROFILE: Profile = {
  id: 'demo-user',
  full_name: 'Demo User',
  avatar_url: '',
  role: 'admin',
};

export const getProfile = async (_userId: string): Promise<Profile | null> =>
  DEMO_PROFILE;

export const updateUserProfile = async (
  _session: Session,
  fullName: string,
  _avatarFile: File | null,
  _currentProfile: Record<string, unknown> | null
) => ({ ...DEMO_PROFILE, full_name: fullName });

export const getAgencies = async () => [
  { id: 'demo-agency', name: 'Demo Drainage Agency' },
  { id: 'demo-agency-2', name: 'City Engineering Office' },
];

export const linkAgencyToProfile = async (
  _userId: string,
  agencyId: string
) => ({ ...DEMO_PROFILE, agency_id: agencyId });

export const unlinkAgencyFromProfile = async (_userId: string) => ({
  ...DEMO_PROFILE,
  agency_id: null,
});
