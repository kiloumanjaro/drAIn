'use client';

import { useState } from 'react';
import { toast } from 'sonner';
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
import { reviewMaintenance } from '@/lib/supabase/maintenance';
import type { HistoryItem } from './maintenance.helpers';

const BADGE = {
  verified: {
    text: 'Checked: fixed',
    className: 'border-green-500/20 bg-green-500/10 text-green-700',
  },
  disputed: {
    text: 'Disputed',
    className: 'border-red-500/20 bg-red-500/10 text-red-700',
  },
  unverified: {
    text: 'Not checked yet',
    className: 'border-gray-500/20 bg-gray-500/10 text-gray-600',
  },
} as const;

/**
 * Whether someone other than the crew has checked a finished job, and, for
 * staff who didn't do it, buttons to check it. A dispute needs a reason and
 * puts the component's reports back on the work list. Work in progress has
 * nothing to check yet, so shows nothing.
 */
export default function MaintenanceVerification({
  record,
  onChanged,
}: {
  record: HistoryItem;
  onChanged: () => void;
}) {
  const [disputing, setDisputing] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  if (record.status !== 'resolved') return null;

  const badge = BADGE[record.verification_status];

  const submit = async (verdict: 'confirmed' | 'disputed') => {
    setSaving(true);
    try {
      await reviewMaintenance(
        record.id,
        verdict,
        verdict === 'disputed' ? note : undefined
      );
      toast.success(
        verdict === 'confirmed'
          ? 'Marked as checked'
          : 'Disputed; its reports are open again'
      );
      setDisputing(false);
      setNote('');
      onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Check failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span
        className={`w-fit rounded-md border px-2 py-0.5 text-[10px] ${badge.className}`}
      >
        {badge.text}
      </span>
      {record.verification_status === 'disputed' && record.latest_dispute && (
        <p className="text-[11px] text-red-700">“{record.latest_dispute}”</p>
      )}

      {record.my_verdict ? (
        <p className="text-muted-foreground text-[11px]">
          You {record.my_verdict === 'confirmed' ? 'confirmed' : 'disputed'}{' '}
          this.
        </p>
      ) : record.can_review ? (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px]"
            disabled={saving}
            onClick={() => submit('confirmed')}
          >
            Confirm it&apos;s fixed
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] text-red-700"
            disabled={saving}
            onClick={() => setDisputing(true)}
          >
            Not fixed
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-[11px]">
          Someone else has to check your own work.
        </p>
      )}

      <Dialog open={disputing} onOpenChange={setDisputing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>What is still wrong?</DialogTitle>
            <DialogDescription>
              The reports this job closed go back on the work list, and the job
              shows as disputed.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Grate still full of silt"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputing(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={saving || !note.trim()}
              onClick={() => submit('disputed')}
            >
              Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
