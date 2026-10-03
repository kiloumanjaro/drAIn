'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface AgencyLinkProps {
  /** Resolves once joined; rejects with a message to show on a bad code. */
  onJoin?: (code: string) => Promise<void>;
  disabled?: boolean;
}

export default function AgencyLink({ onJoin, disabled }: AgencyLinkProps) {
  const [code, setCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleJoin = async () => {
    if (!onJoin) return;
    setSubmitting(true);
    try {
      await onJoin(code.trim());
      setCode('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Label htmlFor="agency-code" className="mb-2">
        Agency Link
      </Label>
      <label className="text-muted-foreground mb-5 text-xs leading-tight">
        Enter the join code your agency gave you. Joining an agency gives you
        access to its admin features.
      </label>
      <Input
        id="agency-code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="XXXX-XXXX-XX"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled || submitting}
      />

      <div className="flex items-start space-x-2 pt-2">
        <Checkbox
          id="agreement"
          checked={agreed}
          onCheckedChange={(checked) => setAgreed(checked as boolean)}
          disabled={disabled}
          className="mt-1"
        />
        <label
          htmlFor="agreement"
          className="text-muted-foreground text-xs leading-tight"
        >
          I understand this is a demo environment. Actions here reflect on the
          linked agency. I will use features responsibly and avoid reckless
          tampering.
        </label>
      </div>

      <CardFooter className="flex justify-end p-0 pt-4">
        <Button
          onClick={handleJoin}
          disabled={disabled || submitting || !code.trim() || !agreed}
        >
          {submitting ? 'Joining...' : 'Join Agency'}
        </Button>
      </CardFooter>
    </>
  );
}
