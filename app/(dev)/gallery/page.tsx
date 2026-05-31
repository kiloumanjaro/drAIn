'use client';

import AgencyInfo from '@/components/_unused/agency-info';
import { ContributorsButton } from '@/components/_unused/contributors-button';
import { MoreOptions } from '@/components/_unused/settings-button';
import { StoryRingAvatar } from '@/components/_unused/story-ring';
import { TeamSwitcher } from '@/components/_unused/team-switcher';
import { VulnerabilityBadge } from '@/components/_unused/vulnerability-badge';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Building2 } from 'lucide-react';

interface GalleryCardProps {
  name: string;
  path: string;
  description: string;
  children: React.ReactNode;
}

function GalleryCard({ name, path, description, children }: GalleryCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{name}</h2>
            <p className="mt-0.5 text-sm text-gray-500">{description}</p>
          </div>
          <code className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
            {path}
          </code>
        </div>
      </div>
      <div className="flex min-h-[100px] items-center justify-center p-8">
        {children}
      </div>
    </div>
  );
}

export default function UnusedGalleryPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Unused Component Gallery
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            6 components with zero imports — review visually and decide whether
            to keep or delete.
          </p>
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            <strong>Dev page</strong> — files live in{' '}
            <code className="font-mono">components/_unused/</code>. To delete a
            component, remove its file. To restore, move it back to{' '}
            <code className="font-mono">components/</code>.
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <GalleryCard
            name="StoryRingAvatar"
            path="components/_unused/story-ring.tsx"
            description="Facebook-style avatar with blue gradient ring. Navigates to profile or login on click."
          >
            <div className="flex items-center gap-6">
              <StoryRingAvatar
                src="/placeholder.svg"
                alt="Demo"
                size="sm"
                isSignedIn
              />
              <StoryRingAvatar
                src="/placeholder.svg"
                alt="Demo"
                size="md"
                isSignedIn
              />
              <StoryRingAvatar
                src="/placeholder.svg"
                alt="Demo"
                size="lg"
                isSignedIn
              />
            </div>
          </GalleryCard>

          <GalleryCard
            name="AgencyInfo"
            path="components/_unused/agency-info.tsx"
            description="Card displaying the user's linked agency with an Unlink button. Was likely used in profile/settings."
          >
            <div className="w-full max-w-sm">
              <AgencyInfo
                agencyName="Mandaue City DPWH"
                onUnlink={() => alert('Unlink clicked')}
              />
            </div>
          </GalleryCard>

          <GalleryCard
            name="ContributorsButton"
            path="components/_unused/contributors-button.tsx"
            description="Stacked avatar row that expands into a contributors panel with GitHub links."
          >
            <ContributorsButton />
          </GalleryCard>

          <GalleryCard
            name="MoreOptions"
            path="components/_unused/settings-button.tsx"
            description="Three-dot dropdown with Edit / Delete / Share items. Handlers are empty stubs."
          >
            <MoreOptions />
          </GalleryCard>

          <GalleryCard
            name="TeamSwitcher"
            path="components/_unused/team-switcher.tsx"
            description="Sidebar menu item showing team name and plan tier. Requires SidebarProvider (wrapped here)."
          >
            <SidebarProvider className="min-h-0">
              <TeamSwitcher
                team={{ name: 'DrAIn Team', logo: Building2, plan: 'Pro' }}
              />
            </SidebarProvider>
          </GalleryCard>

          <GalleryCard
            name="VulnerabilityBadge"
            path="components/_unused/vulnerability-badge.tsx"
            description="Colored pill badge for flood vulnerability level. Three variants: high, moderate, low."
          >
            <div className="flex gap-3">
              <VulnerabilityBadge rating="high" />
              <VulnerabilityBadge rating="moderate" />
              <VulnerabilityBadge rating="low" />
            </div>
          </GalleryCard>
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          Route: <code>/gallery</code> · Source:{' '}
          <code>app/(dev)/gallery/page.tsx</code>
        </p>
      </div>
    </div>
  );
}
