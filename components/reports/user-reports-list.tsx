'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchMyReports, type Report } from '@/lib/supabase/report';
import { TONE_CLASSES, reviewLabel } from '@/lib/reports/trust-labels';
import { format } from 'date-fns';

interface UserReportsListProps {
  userId?: string;
  isGuest?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  resolved:
    'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  'in-progress':
    'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  pending:
    'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
};

/**
 * The signed-in person's own reports, newest first, with where each one
 * stands and what staff made of it. It used to match reports on the
 * reporter's name against their user id, so it was always empty.
 */
export default function UserReportsList({
  userId,
  isGuest = false,
}: UserReportsListProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      setReports([]);
      return;
    }
    setLoading(true);
    try {
      setReports(await fetchMyReports(userId));
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card className="flex h-full max-h-[350px] flex-col gap-0 overflow-hidden rounded-none border-none py-0">
      <CardContent className="relative flex-1 overflow-y-auto p-4 pl-6">
        {reports.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-muted-foreground px-15 pt-8 pb-12 text-center text-sm">
              {isGuest
                ? 'Reports are not recorded when not signed in'
                : loading
                  ? 'Loading your reports...'
                  : "You haven't submitted any reports yet."}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((item) => {
              const review = reviewLabel(item.reviewStatus, item.reviewNote);
              return (
                <div
                  key={item.id}
                  className="hover:bg-accent flex flex-col gap-3 rounded-lg border px-5 py-3 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-foreground mb-2 line-clamp-2 text-xs">
                      {item.description}
                    </p>
                    <div className="text-muted-foreground flex items-center gap-2 text-[10px]">
                      <span>{format(new Date(item.date), 'MMM dd, yyyy')}</span>
                      <span>{item.componentId}</span>
                    </div>
                  </div>

                  <div className="flex flex-row flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className="h-5 justify-center px-3 py-0 text-[10px] font-normal"
                    >
                      {item.category}
                    </Badge>
                    <div
                      className={`flex h-5 items-center justify-center rounded-md border px-3 py-0.5 text-[10px] ${
                        STATUS_STYLES[item.status] ?? STATUS_STYLES.pending
                      }`}
                    >
                      {item.status}
                    </div>
                    <div
                      className={`flex h-5 items-center rounded-md border px-2 text-[10px] ${TONE_CLASSES[review.tone]}`}
                    >
                      {review.text}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
