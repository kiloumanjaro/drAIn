'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, KeyRound, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  fetchAgencyMembers,
  rotateJoinCode,
  setMemberRole,
  type AgencyMember,
} from '@/lib/supabase/profile';

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong.';

/**
 * An agency admin's tools: a new join code, and the members with their
 * roles. Every action is checked again by the database (admin only; nobody
 * changes their own role).
 */
export default function AgencyAdmin({
  agencyId,
  currentUserId,
}: {
  agencyId: string;
  currentUserId: string;
}) {
  const [members, setMembers] = useState<AgencyMember[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmingCode, setConfirmingCode] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await fetchAgencyMembers(agencyId);
      setMembers(list);
      setLoadError(null);
    } catch (error) {
      setLoadError(messageOf(error));
    }
  }, [agencyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const makeCode = async () => {
    setBusy('code');
    try {
      setNewCode(await rotateJoinCode(agencyId));
      setConfirmingCode(false);
    } catch (error) {
      toast.error(messageOf(error));
    } finally {
      setBusy(null);
    }
  };

  const copyCode = async () => {
    if (!newCode) return;
    try {
      await navigator.clipboard.writeText(newCode);
      toast.success('Code copied');
    } catch {
      toast.error('Could not copy; select the code and copy it by hand.');
    }
  };

  const changeRole = async (
    member: AgencyMember,
    role: AgencyMember['role']
  ) => {
    setBusy(member.id);
    try {
      await setMemberRole(member.id, agencyId, role);
      const name = member.full_name || member.email;
      toast.success(
        role === 'citizen'
          ? `${name} was removed from the agency`
          : `${name} is now ${role}`
      );
      await load();
    } catch (error) {
      toast.error(messageOf(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="w-full space-y-6 text-left">
      <section className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <KeyRound className="h-3.5 w-3.5" /> Join code
        </Label>
        <p className="text-muted-foreground text-xs">
          People join this agency with its code. Only a hash is stored, so a
          code can be shown only when it is made. A new code replaces the old
          one immediately.
        </p>
        {newCode ? (
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2">
            <code className="flex-1 font-mono text-sm tracking-wider select-all">
              {newCode}
            </code>
            <Button size="sm" variant="outline" onClick={copyCode}>
              <Copy className="mr-1 h-3.5 w-3.5" /> Copy
            </Button>
          </div>
        ) : null}
        {newCode && (
          <p className="text-xs text-amber-800">
            Copy it now: it won&apos;t be shown again.
          </p>
        )}
        {confirmingCode ? (
          <div className="flex items-center gap-2">
            <span className="text-xs">The current code stops working.</span>
            <Button size="sm" onClick={makeCode} disabled={busy === 'code'}>
              {busy === 'code' ? 'Making…' : 'Make new code'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmingCode(false)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmingCode(true)}
          >
            New join code
          </Button>
        )}
      </section>

      <section className="space-y-2">
        <Label>Members</Label>
        {loadError ? (
          <p className="text-xs text-red-600">{loadError}</p>
        ) : members === null ? (
          <p className="text-muted-foreground text-xs">Loading members…</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {members.map((member) => {
              const self = member.id === currentUserId;
              return (
                <li
                  key={member.id}
                  className="flex items-center gap-2 px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {member.full_name || 'No name'}
                      {self && (
                        <span className="text-muted-foreground font-normal">
                          {' '}
                          (you)
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground truncate text-xs">
                      {member.email}
                    </div>
                  </div>
                  {self ? (
                    <span className="text-muted-foreground text-xs capitalize">
                      {member.role}
                    </span>
                  ) : (
                    <>
                      <Select
                        value={member.role}
                        onValueChange={(role) =>
                          changeRole(member, role as AgencyMember['role'])
                        }
                        disabled={busy === member.id}
                      >
                        <SelectTrigger
                          className="h-8 w-24 text-xs"
                          aria-label={`Role of ${member.full_name || member.email}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => changeRole(member, 'citizen')}
                        disabled={busy === member.id}
                        aria-label={`Remove ${member.full_name || member.email} from the agency`}
                        title="Remove from the agency"
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
