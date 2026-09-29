'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  fetchMyReports,
  fetchMyResolutionVerdicts,
  respondToResolution,
  type Report,
} from '@/lib/supabase/report';
import type { ReviewVerdict } from '@/lib/supabase/enums';
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

/** How long after a fix the reporter may still say whether it held. */
const ANSWER_WINDOW_DAYS = 30;

function canStillAnswer(report: Report): boolean {
  if (report.status !== 'resolved' || !report.resolvedByMaintenanceId) {
    return false;
  }
  if (!report.resolvedAt) return true;
  const ageDays =
    (Date.now() - new Date(report.resolvedAt).getTime()) / 86_400_000;
  return ageDays <= ANSWER_WINDOW_DAYS;
}

/**
 * The signed-in person's own reports, newest first, with where each one
 * stands and what staff made of it. When a report is marked fixed, its
 * reporter is asked whether it really is: "not fixed" reopens it. That is
 * the independent check on the crew's own word that the job is done.
 *
 * It used to match reports on the reporter's name against their user id,
 * so it was always empty.
 */
export default function UserReportsList({
  userId,
  isGuest = false,
}: UserReportsListProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [verdicts, setVerdicts] = useState<Map<string, ReviewVerdict>>(
    new Map()
  );
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [disputing, setDisputing] = useState<Report | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      setReports([]);
      setVerdicts(new Map());
      return;
    }
    setLoading(true);
    try {
      const [mine, answers] = await Promise.all([
        fetchMyReports(userId),
        fetchMyResolutionVerdicts(userId),
      ]);
      setReports(mine);
      setVerdicts(answers);
      setFailed(false);
    } catch {
      // Said, rather than shown as "no reports yet".
      setReports([]);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const answer = async (
    report: Report,
    verdict: ReviewVerdict,
    reason?: string
  ) => {
    setSaving(true);
    try {
      await respondToResolution(report.id, verdict, reason);
      toast.success(
        verdict === 'confirmed'
          ? 'Thanks for confirming'
          : 'Thanks. Your report is open again.'
      );
      setDisputing(null);
      setNote('');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

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
                  : failed
                    ? "Couldn't load your reports. Try again in a moment."
                    : "You haven't submitted any reports yet."}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((item) => {
              const review = reviewLabel(item.reviewStatus, item.reviewNote);
              const verdict = verdicts.get(item.id);
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

                  {verdict === 'confirmed' && item.status === 'resolved' && (
                    <p className="text-[11px] text-green-700">
                      You confirmed it was fixed.
                    </p>
                  )}
                  {verdict === 'disputed' && item.status !== 'resolved' && (
                    <p className="text-[11px] text-red-700">
                      You said it wasn&apos;t fixed, so it is open again.
                    </p>
                  )}
                  {!verdict && canStillAnswer(item) && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-medium">
                        Marked fixed. Is it?
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[11px]"
                        disabled={saving}
                        onClick={() => answer(item, 'confirmed')}
                      >
                        Yes
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[11px] text-red-700"
                        disabled={saving}
                        onClick={() => setDisputing(item)}
                      >
                        No
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog
        open={disputing !== null}
        onOpenChange={(open) => !open && setDisputing(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>What is still wrong?</DialogTitle>
            <DialogDescription>
              Your report goes back on the work list, and the agency sees that
              the fix was disputed.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Still floods when it rains"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputing(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={saving || !note.trim()}
              onClick={() => disputing && answer(disputing, 'disputed', note)}
            >
              It&apos;s not fixed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
