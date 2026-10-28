'use client';

import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Info, Plus } from 'lucide-react';
import { formatDays } from '@/lib/dashboard/calculations';
import { Card } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface StatsCardsProps {
  fixedThisMonth: number;
  pendingIssues: number;
  averageRepairDays: number;
  totalAdmins: number;
  /** Of fixedThisMonth, those someone other than the crew confirmed. */
  verifiedFixedThisMonth?: number;
  /** Finished work nobody has checked yet. */
  awaitingVerification?: number;
  loading?: boolean;
}

interface StatCard {
  id: string;
  label: string;
  value: string | number;
  tooltipText: string;
  note?: string;
}

// Shared by the loaded cards and their loading placeholders, so the page
// does not jump when the figures arrive.
const GRID_CLASS = 'mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4';
const CARD_CLASS =
  'flex flex-col rounded-xl border border-[#dfdfdf] bg-[#f7f7f7]';
const HEADER_CLASS =
  'flex flex-row items-center justify-between rounded-t-xl px-4 py-2';
const BODY_CLASS =
  'flex-1 gap-3 space-y-3 border-x-0 border-b-0 border-[#dfdfdf]';

/** e.g. "3 checked · 2 jobs awaiting a check". */
function verificationNote(
  verified: number | undefined,
  awaiting: number | undefined
): string | undefined {
  if (verified === undefined) return undefined;
  const waiting = awaiting
    ? ` · ${awaiting} job${awaiting === 1 ? '' : 's'} awaiting a check`
    : '';
  return `${verified} checked${waiting}`;
}

export default function StatsCards({
  fixedThisMonth,
  pendingIssues,
  averageRepairDays,
  totalAdmins,
  verifiedFixedThisMonth,
  awaitingVerification,
  loading = false,
}: StatsCardsProps) {
  const router = useRouter();

  const handleAddAdmin = () => {
    router.push('/map?activetab=profile');
  };

  if (loading) {
    return (
      <div className={GRID_CLASS}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={CARD_CLASS}>
            {/* h-4 and h-8 are the line heights of the label and the value. */}
            <div className={HEADER_CLASS}>
              <Skeleton className="h-4 w-24" />
            </div>
            <Card className={BODY_CLASS}>
              <div className="flex items-start justify-between px-8">
                <Skeleton className="h-8 w-16" />
              </div>
            </Card>
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    {
      id: 'fixed',
      label: 'Fixed This Month',
      value: fixedThisMonth,
      tooltipText:
        'Reports resolved this month. "Checked" counts fixes confirmed by someone other than the crew that did the work: a colleague, or the person who reported it.',
      note: verificationNote(verifiedFixedThisMonth, awaitingVerification),
    },
    {
      id: 'pending',
      label: 'Pending Issues',
      value: pendingIssues,
      tooltipText: 'Reports that are awaiting action from an admin',
    },
    {
      id: 'repair',
      label: 'Average Repair Time',
      value: formatDays(averageRepairDays),
      tooltipText: 'From report to completion',
    },
    {
      id: 'admins',
      label: 'Agency Staff',
      value: totalAdmins,
      tooltipText: 'People who have joined an agency with its join code',
    },
  ] as StatCard[];

  return (
    <TooltipProvider>
      <div className={GRID_CLASS}>
        {stats.map((stat) => {
          const isAdminCard = stat.id === 'admins';

          return (
            <div key={stat.id} className={CARD_CLASS}>
              <div className={HEADER_CLASS}>
                <span className="text-xs">{stat.label}</span>
                <Tooltip>
                  <TooltipTrigger
                    type="button"
                    aria-label={`About ${stat.label}`}
                    className="focus-visible:ring-ring hit-area inline-flex cursor-help rounded-full focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <Info
                      aria-hidden="true"
                      className="h-3.5 w-3.5 cursor-help opacity-70"
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{stat.tooltipText}</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <Card className={`${BODY_CLASS} ${isAdminCard ? 'py-3' : ''}`}>
                {isAdminCard ? (
                  <div className="flex items-start justify-between px-8 py-2">
                    <div className="flex flex-1 items-center gap-3">
                      <p className="text-2xl font-semibold whitespace-nowrap text-gray-900">
                        {stat.value}
                      </p>
                    </div>
                    <button
                      onClick={handleAddAdmin}
                      title="Join an agency from your profile"
                      className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gray-200 text-gray-600 hover:bg-gray-300"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between px-8">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="text-2xl font-semibold whitespace-nowrap text-gray-900">
                          {stat.value}
                        </p>
                      </div>
                      {stat.note && (
                        <p className="mt-1 text-xs text-gray-500">
                          {stat.note}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
