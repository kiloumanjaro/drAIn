'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AgencyLink from '@/components/agency-link';
import { toast } from 'sonner';

interface UserLinksProps {
  isGuest?: boolean;
  profile?: Record<string, unknown> | null;
  onLink?: (agencyId: string, agencyName: string) => Promise<void>;
  onUnlink?: () => Promise<void>;
}

export default function UserLinks({
  isGuest = false,
  profile,
  onLink,
  onUnlink,
}: UserLinksProps) {
  const handleUnlink = async () => {
    if (onUnlink) {
      await onUnlink();
      toast.success('Agency unlinked successfully');
    }
  };

  const handleLink = async (agencyId: string, agencyName: string) => {
    if (onLink) {
      await onLink(agencyId, agencyName);
      toast.success(`Successfully linked to ${agencyName}`);
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
            <Button
              className="self-center"
              onClick={handleUnlink}
              disabled={isGuest}
            >
              Unlink Agency
            </Button>
          </div>
        ) : (
          <div className="flex w-full flex-col justify-center space-y-2">
            <AgencyLink onLink={handleLink} disabled={isGuest} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
