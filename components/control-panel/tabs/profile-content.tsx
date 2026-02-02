'use client';

import { useContext } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs-modified';
import { Pencil, Link2, FileText } from 'lucide-react';
import { AuthContext } from '@/components/context/AuthProvider';
import client from '@/app/api/client';
import {
  updateUserProfile,
  linkAgencyToProfile,
  unlinkAgencyFromProfile,
} from '@/lib/supabase/profile';
import EditProfile from '@/components/edit-profile';
import UserLinks from '@/components/user-links';
import UserReportsList from '@/components/user-reports-list';
import type { ProfileView } from '../hooks/use-control-panel-state';
import Image from 'next/image';

interface ProfileContentProps {
  profileView: ProfileView;
  onProfileViewChange: (view: ProfileView) => void;
  profile: Record<string, unknown> | null;
  publicAvatarUrl: string | null;
  setProfile: (profile: Record<string, unknown>) => void;
  setPublicAvatarUrl: (url: string | null) => void;
}

export default function ProfileContent({
  profileView,
  onProfileViewChange,
  profile,
  publicAvatarUrl,
  setProfile,
  setPublicAvatarUrl,
}: ProfileContentProps) {
  const authContext = useContext(AuthContext);
  const session = authContext?.session;
  const isGuest = !session;
  const supabase = client;
  const loading = !profile && !isGuest;

  const handleSave = async (fullName: string, avatarFile: File | null) => {
    if (!session) return;

    const updatedProfile = await updateUserProfile(
      session,
      fullName,
      avatarFile,
      profile
    );
    let newPublicAvatarUrl = null;
    if (updatedProfile.avatar_url) {
      const { data: urlData } = supabase.storage
        .from('Avatars')
        .getPublicUrl(updatedProfile.avatar_url);
      newPublicAvatarUrl = urlData.publicUrl;
    }
    setProfile(updatedProfile);
    setPublicAvatarUrl(newPublicAvatarUrl);

    const cacheKey = `profile-${session.user.id}`;
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        profile: updatedProfile,
        publicAvatarUrl: newPublicAvatarUrl,
      })
    );
  };

  const handleLinkAgency = async (agencyId: string, agencyName: string) => {
    if (!profile || !session) return;
    await linkAgencyToProfile(session.user.id, agencyId); // Persist to Supabase
    const updatedProfile = {
      ...profile,
      agency_id: agencyId,
      agency_name: agencyName,
    };
    setProfile(updatedProfile);
    // Also update the cache
    const cacheKey = `profile-${session.user.id}`;
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        profile: updatedProfile,
        publicAvatarUrl: publicAvatarUrl,
      })
    );
  };

  const handleUnlinkAgency = async () => {
    if (!profile || !session) return;
    await unlinkAgencyFromProfile(session.user.id); // Persist to Supabase
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { agency_id, agency_name, ...rest } = profile;
    const updatedProfile = { ...rest };
    setProfile(updatedProfile);
    // Also update the cache
    const cacheKey = `profile-${session.user.id}`;
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        profile: updatedProfile,
        publicAvatarUrl: publicAvatarUrl,
      })
    );
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto pr-2.5 pl-5">
      {loading ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      ) : (
        <>
          {/* Profile Card */}
          <div className="mb-4 flex flex-shrink-0 flex-col justify-center gap-2">
            <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#e2e2e2] bg-[#f7f7f7]">
              {/* Header Section */}
              <div className="relative p-1">
                <Card className="flex flex-row gap-4 p-1">
                  {/* Avatar */}
                  <Avatar className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-[#f2f2f2]">
                    <AvatarImage
                      src={publicAvatarUrl || undefined}
                      alt="User Avatar"
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-[#f2f2f2]">
                      <Image
                        src="/images/placeholder.jpg"
                        alt="Unknown User"
                        fill
                        className="object-cover transition-all duration-200"
                      />
                    </AvatarFallback>
                  </Avatar>

                  {/* Profile Info */}
                  <div className="min-w-0 flex-1 flex-col self-center">
                    <h1 className="truncate text-base font-semibold text-black">
                      {(profile?.full_name as string) || 'No name set'}
                    </h1>

                    <div className="flex flex-col">
                      <p className="truncate text-xs text-zinc-400">
                        {session?.user?.email || 'No email'}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <Tabs
            value={profileView === 'main' ? 'reports' : profileView}
            onValueChange={(value) => onProfileViewChange(value as ProfileView)}
            className="flex min-h-0 flex-1 flex-col gap-0 space-y-0"
          >
            <TabsList className="flex-shrink-0 border-x-1 border-b-0 border-[#ced1cd] pb-0.5">
              <TabsTrigger value="edit">
                <Pencil className="h-4 w-4" />
                <span className="text-xs font-normal">Edit</span>
              </TabsTrigger>
              <TabsTrigger value="links">
                <Link2 className="h-4 w-4" />
                <span className="text-xs font-normal">Links</span>
              </TabsTrigger>
              <TabsTrigger value="reports">
                <FileText className="h-4 w-4" />
                <span className="text-xs font-normal">Reports</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="edit"
              className="mb-5 flex-1 overflow-y-auto rounded-b-xl border border-t-0 border-[#ced1cd]"
            >
              <EditProfile
                profile={profile}
                session={session}
                onSave={handleSave}
                onCancel={() => onProfileViewChange('reports')}
              />
            </TabsContent>

            <TabsContent
              value="links"
              className="mb-5 flex-1 overflow-y-auto rounded-b-xl border border-t-0 border-[#ced1cd]"
            >
              <UserLinks
                isGuest={isGuest}
                profile={profile}
                onLink={handleLinkAgency}
                onUnlink={handleUnlinkAgency}
              />
            </TabsContent>

            <TabsContent
              value="reports"
              className="mb-5 flex-1 overflow-y-auto rounded-b-xl border border-t-0 border-[#ced1cd]"
            >
              <UserReportsList userId={session?.user?.id} isGuest={isGuest} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
