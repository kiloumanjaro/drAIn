'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';
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
import { useAuth } from '@/components/context/auth-provider';
import { isAgencyStaff } from '@/lib/supabase/profile';
import { reviewReport, type Report } from '@/lib/supabase/report';
import { dashboardKeys, reportKeys } from '@/lib/query/keys';
import {
  TONE_CLASSES,
  photoAgeLabel,
  photoLocationLabel,
  reviewLabel,
  type TrustLabel,
} from '@/lib/reports/trust-labels';

function Chip({ label }: { label: TrustLabel }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] ${TONE_CLASSES[label.tone]}`}
    >
      {label.text}
    </span>
  );
}

/**
 * What is known about whether a report is genuine: where its photo was
 * taken, how old the photo was, and what staff made of it. Staff also get
 * Confirm and Reject. A rejected report drops out of every count and public
 * list; rejecting needs a reason, which the reporter sees.
 */
export default function ReportReview({ report }: { report: Report }) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const age = photoAgeLabel(report.photoTakenAt, report.date);
  const staff = isAgencyStaff(profile);

  const submit = async (verdict: 'confirmed' | 'rejected') => {
    setSaving(true);
    try {
      await reviewReport(
        report.id,
        verdict,
        verdict === 'rejected' ? reason : undefined
      );
      toast.success(
        verdict === 'confirmed' ? 'Report confirmed' : 'Report rejected'
      );
      setRejecting(false);
      setReason('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
        queryClient.invalidateQueries({ queryKey: reportKeys.all }),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Review failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    // Clicks here must not open the map, which the card does.
    <div
      className="flex flex-col gap-2"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="presentation"
    >
      <div className="flex flex-wrap gap-1.5">
        <Chip
          label={photoLocationLabel(report.photoCheck, report.photoDistanceM)}
        />
        {age && <Chip label={age} />}
        <Chip label={reviewLabel(report.reviewStatus, report.reviewNote)} />
      </div>

      {staff && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 flex-1 text-xs"
            disabled={saving || report.reviewStatus === 'confirmed'}
            onClick={() => submit('confirmed')}
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            Confirm
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 flex-1 text-xs text-red-700"
            disabled={saving || report.reviewStatus === 'rejected'}
            onClick={() => setRejecting(true)}
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Reject
          </Button>
        </div>
      )}

      <Dialog open={rejecting} onOpenChange={setRejecting}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject this report?</DialogTitle>
            <DialogDescription>
              It will drop out of the map counts and the dashboard. The reporter
              sees the reason you give.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Duplicate of an open report; photo is from elsewhere"
            aria-label="Reason for rejecting the report"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={saving || !reason.trim()}
              onClick={() => submit('rejected')}
            >
              Reject report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
