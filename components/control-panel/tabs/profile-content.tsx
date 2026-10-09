'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Pencil, Link2, FileText, UserRound } from 'lucide-react';
import { useAuth } from '@/components/context/auth-provider';
import {
  updateUserProfile,
  joinAgency,
  leaveAgency,
} from '@/lib/supabase/profile';
import type { Profile } from '@/lib/supabase/profile';
import { profileKeys } from '@/lib/query/keys';
import EditProfile from '@/components/profile/edit-profile';
import UserLinks from '@/components/profile/user-links';
import UserReportsList from '@/components/reports/user-reports-list';
import type { ProfileView } from '../hooks/use-control-panel-state';
import Image from 'next/image';

interface ProfileContentProps {
  profileView: ProfileView;
  onProfileViewChange: (view: ProfileView) => void;
}

export default function ProfileContent({
  profileView,
  onProfileViewChange,
}: ProfileContentProps) {
  const queryClient = useQueryClient();
  const { session, profile, publicAvatarUrl, loading: authLoading } = useAuth();
  const isGuest = !session;
  const loading = authLoading || (!profile && !isGuest);
  // The profile holds only the agency's id; its name is known just after
  // joining, from the join itself.
  const [joinedAgency, setJoinedAgency] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Shown at once from what the database returned, then read again so the
  // rest of the app never keeps a copy that differs from the stored row.
  const showProfile = (userId: string, next: Profile) => {
    queryClient.setQueryData<Profile | null>(profileKeys.detail(userId), next);
    return queryClient.invalidateQueries({
      queryKey: profileKeys.detail(userId),
    });
  };

  const handleSave = async (
    fullName: string,
    avatarFile: File | null,
    showNameOnReports: boolean
  ) => {
    if (!session) return;

    const updatedProfile = await updateUserProfile(
      session,
      fullName,
      avatarFile,
      profile,
      showNameOnReports
    );
    queryClient.setQueryData<Profile | null>(
      profileKeys.detail(session.user.id),
      updatedProfile
    );
  };

  /** Joins with a code; resolves to the agency's name for the toast. */
  const handleJoinAgency = async (code: string): Promise<string> => {
    if (!profile || !session) return '';
    const agency = await joinAgency(code);
    setJoinedAgency({ id: agency.id, name: agency.name });
    void showProfile(session.user.id, {
      ...profile,
      role: 'staff',
      agency_id: agency.id,
    });
    return agency.name;
  };

  const handleLeaveAgency = async () => {
    if (!profile || !session) return;
    await leaveAgency();
    setJoinedAgency(null);
    void showProfile(session.user.id, {
      ...profile,
      role: 'citizen',
      agency_id: null,
    });
  };

  const linksProfile =
    profile && joinedAgency?.id === profile.agency_id
      ? { ...profile, agency_name: joinedAgency.name }
      : profile;

  return (
    <div className="flex h-full flex-col overflow-y-auto pr-2.5 pl-5">
      {loading ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      ) : isGuest ? (
        // Signed out there is no profile to show. This used to be an empty
        // card ("No name set", "No email") above tabs that did nothing.
        <div className="flex h-full items-center justify-center pb-5">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#DCDCDC] bg-[#EBEBEB]">
              <UserRound className="h-6 w-6 self-center text-[#8D8D8D]" />
            </div>

            <p className="text-sm font-medium text-gray-900">Not signed in</p>
            <p className="mt-0.5 text-xs text-gray-600">
              Sign in to see your profile and reports
            </p>
            <div className="mt-4 flex gap-3">
              <Button asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/signup">Sign up</Link>
              </Button>
            </div>
          </div>
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
                    <h1
                      className="truncate text-base font-semibold text-black"
                      title={profile?.full_name || undefined}
                    >
                      {profile?.full_name || 'No name set'}
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
            value={profileView === 'main' ? 'links' : profileView}
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
                profile={linksProfile}
                onJoin={handleJoinAgency}
                onLeave={handleLeaveAgency}
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
