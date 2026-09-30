import client from '@/lib/supabase/client';
import { Session } from '@supabase/supabase-js';
import type { Tables } from '@/types/database.types';
import type { UserRole } from '@/lib/supabase/enums';

export type Profile = Pick<
  Tables<'profiles'>,
  | 'id'
  | 'full_name'
  | 'avatar_url'
  | 'role'
  | 'agency_id'
  | 'show_name_on_reports'
>;

/**
 * Agency staff or admin. Only a display hint: the database checks the role
 * again on everything staff can do.
 */
export const isAgencyStaff = (
  profile: Pick<Profile, 'role'> | null | undefined
) => !!profile && profile.role !== 'citizen';

export const getProfile = async (userId: string): Promise<Profile | null> => {
  try {
    const { data, error } = await client
      .from('profiles')
      .select(
        'id, full_name, avatar_url, role, agency_id, show_name_on_reports'
      )
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error(
      'An unexpected error occurred while fetching profile:',
      error
    );
    return null;
  }
};

export const updateUserProfile = async (
  session: Session,
  fullName: string,
  avatarFile: File | null,
  currentProfile: Record<string, unknown> | null,
  /** Show the name on this person's reports; left unchanged when omitted. */
  showNameOnReports?: boolean
) => {
  try {
    const user = session.user;

    // Basic input validation
    if (!fullName.trim()) {
      throw new Error('Full name cannot be empty.');
    }

    let avatar_url = (currentProfile?.avatar_url as string | undefined) || '';
    let newAvatarPath: string | null = null;

    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop();
      // New file path to align with RLS policies (user_id/avatar.ext)
      const filePath = `${user.id}/avatar.${fileExt}`;
      newAvatarPath = filePath;

      const { error: uploadError } = await client.storage
        .from('Avatars')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: avatarFile.type,
        });

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError);
        throw uploadError;
      }

      // Store the file path (not the full URL) in the database
      avatar_url = filePath;
    }

    let data, error;

    if (currentProfile) {
      // Update existing profile
      ({ data, error } = await client
        .from('profiles')
        .update({
          full_name: fullName,
          avatar_url: avatar_url,
          ...(showNameOnReports === undefined
            ? {}
            : { show_name_on_reports: showNameOnReports }),
        })
        .eq('id', user.id)
        .select()
        .single());
    } else {
      // Create new profile. Role and agency are left to their defaults;
      // the database refuses anything else from a client.
      ({ data, error } = await client
        .from('profiles')
        .insert({
          id: user.id,
          full_name: fullName,
          avatar_url: avatar_url,
        })
        .select()
        .single());
    }

    if (error) {
      console.error('Error updating profile:', error);
      // If the profile update fails, delete the newly uploaded avatar
      if (newAvatarPath) {
        await client.storage.from('Avatars').remove([newAvatarPath]);
      }
      throw error;
    }

    if (!data) {
      throw new Error('Profile was not returned after saving.');
    }

    return data;
  } catch (error) {
    const err = error as Error;
    const errorMessage = err.message || 'An unknown error occurred.';
    console.error('Error in updateUserProfile:', errorMessage, error);
    throw new Error(errorMessage);
  }
};

/**
 * Join an agency with its join code, making the signed-in user its staff.
 * The database checks the code (see join_agency in supabase/schemas) and
 * rejects a wrong one with a message fit to show the user.
 */
export const joinAgency = async (code: string): Promise<Tables<'agencies'>> => {
  const { data, error } = await client.rpc('join_agency', { p_code: code });

  if (error) {
    console.error('Error joining agency:', error);
    throw new Error(error.message);
  }

  return data;
};

/** Leave the signed-in user's agency; they become a citizen again. */
export const leaveAgency = async (): Promise<void> => {
  const { error } = await client.rpc('leave_agency');

  if (error) {
    console.error('Error leaving agency:', error);
    throw new Error(error.message);
  }
};

/** One member of an agency, as its admin screen lists them. */
export type AgencyMember = {
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
  account_created_at: string;
};

/** The agency's members (admin only; the database checks). */
export const fetchAgencyMembers = async (
  agencyId: string
): Promise<AgencyMember[]> => {
  const { data, error } = await client.rpc('agency_members', {
    p_agency_id: agencyId,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
};

/**
 * Make a new join code for the agency. The old one stops working at once,
 * and the new one is only ever returned here: the database keeps a hash.
 */
export const rotateJoinCode = async (agencyId: string): Promise<string> => {
  const { data, error } = await client.rpc('rotate_agency_join_code', {
    p_agency_id: agencyId,
  });
  if (error) throw new Error(error.message);
  return data;
};

/**
 * Change a member's role (admin only). 'citizen' removes them from the
 * agency. Nobody can change their own role.
 */
export const setMemberRole = async (
  userId: string,
  agencyId: string,
  role: UserRole
): Promise<void> => {
  const { error } = await client.rpc('set_member_agency', {
    p_user_id: userId,
    p_agency_id: agencyId,
    p_role: role,
  });
  if (error) throw new Error(error.message);
};
