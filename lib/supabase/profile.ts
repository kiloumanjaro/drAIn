import client from '@/app/api/client';
import { Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  role: string;
}

export const getProfile = async (userId: string): Promise<Profile | null> => {
  try {
    const { data, error } = await client
      .from('profiles')
      .select('id, full_name, avatar_url, role')
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
  currentProfile: Record<string, unknown> | null
) => {
  try {
    const user = session.user;

    // Basic input validation
    if (!fullName.trim()) {
      throw new Error('Full name cannot be empty.');
    }

    let avatar_url = currentProfile?.avatar_url || '';
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single());
    } else {
      // Create new profile
      ({ data, error } = await client
        .from('profiles')
        .insert({
          id: user.id,
          full_name: fullName,
          avatar_url: avatar_url,
          role: 'user',
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

    return data;
  } catch (error) {
    const err = error as Error;
    const errorMessage = err.message || 'An unknown error occurred.';
    console.error('Error in updateUserProfile:', errorMessage, error);
    throw new Error(errorMessage);
  }
};

export const getAgencies = async () => {
  try {
    const { data, error } = await client
      .from('agencies') // Assuming a table named 'agencies'
      .select('id, name');

    if (error) {
      console.error('Error fetching agencies:', error);
      throw error;
    }

    return data;
  } catch (error) {
    const err = error as Error;
    const errorMessage = err.message || 'An unknown error occurred.';
    console.error('Error in getAgencies:', errorMessage, error);
    throw new Error(errorMessage);
  }
};

export const linkAgencyToProfile = async (userId: string, agencyId: string) => {
  try {
    const { data, error } = await client
      .from('profiles')
      .update({ agency_id: agencyId })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error linking agency:', error);
      throw error;
    }

    return data;
  } catch (error) {
    const err = error as Error;
    const errorMessage = err.message || 'An unknown error occurred.';
    console.error('Error in linkAgencyToProfile:', errorMessage, error);
    throw new Error(errorMessage);
  }
};

export const unlinkAgencyFromProfile = async (userId: string) => {
  try {
    const { data, error } = await client
      .from('profiles')
      .update({ agency_id: null })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error unlinking agency:', error);
      throw error;
    }

    return data;
  } catch (error) {
    const err = error as Error;
    const errorMessage = err.message || 'An unknown error occurred.';
    console.error('Error in unlinkAgencyFromProfile:', errorMessage, error);
    throw new Error(errorMessage);
  }
};
