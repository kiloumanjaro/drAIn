'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AgencyLink from '@/components/profile/agency-link';
import AgencyAdmin from '@/components/profile/agency-admin';
import { toast } from 'sonner';

interface UserLinksProps {
  isGuest?: boolean;
  profile?: Record<string, unknown> | null;
  /** Joins with a code and resolves to the agency's name. */
  onJoin?: (code: string) => Promise<string>;
  onLeave?: () => Promise<void>;
}

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong.';

export default function UserLinks({
  isGuest = false,
  profile,
  onJoin,
  onLeave,
}: UserLinksProps) {
  const handleLeave = async () => {
    if (!onLeave) return;
    try {
      await onLeave();
      toast.success('You left the agency');
    } catch (error) {
      toast.error(messageOf(error));
    }
  };

  const handleJoin = async (code: string) => {
    if (!onJoin) return;
    try {
      const agencyName = await onJoin(code);
      toast.success(`You joined ${agencyName}`);
    } catch (error) {
      toast.error(messageOf(error));
    }
  };

  return (
    <Card className="flex h-full flex-col rounded-none border-none pb-12">
      <CardContent className="flex flex-1 justify-center">
        {profile?.agency_id ? (
          <div className="flex flex-col justify-center space-y-6 text-center">
            <div className="text-muted-foreground text-sm">
              You are linked to {(profile.agency_name as string) || 'an agency'}
              . You can now respond to reports.
            </div>
            {profile.role === 'admin' && (
              <AgencyAdmin
                agencyId={profile.agency_id as string}
                currentUserId={profile.id as string}
              />
            )}
            {/* Admins can't leave on their own; another admin demotes them. */}
            {profile.role !== 'admin' && (
              <Button
                className="self-center"
                onClick={handleLeave}
                disabled={isGuest}
              >
                Leave Agency
              </Button>
            )}
          </div>
        ) : (
          <div className="flex w-full flex-col justify-center space-y-2">
            <AgencyLink onJoin={handleJoin} disabled={isGuest} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
