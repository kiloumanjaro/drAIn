'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Session } from '@supabase/supabase-js';
import ImageUploader from '@/components/common/image-uploader';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CharCount } from '@/components/common/char-count';
import { IconInfoCircleFilled } from '@tabler/icons-react';

interface EditProfileProps {
  profile: Record<string, unknown> | null;
  session: Session | null | undefined;
  onSave: (
    fullName: string,
    avatarFile: File | null,
    showNameOnReports: boolean
  ) => Promise<void>;
  onCancel: () => void;
}

export default function EditProfile({
  profile,
  session,
  onSave,
  onCancel,
}: EditProfileProps) {
  const [fullName, setFullName] = useState(String(profile?.full_name || ''));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  // Profiles saved before the setting existed have no value: shown.
  const savedShowName = profile?.show_name_on_reports !== false;
  const [showName, setShowName] = useState(savedShowName);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isGuest = !session;

  const handleSave = async () => {
    if (!session) return;
    setErrorMessage(null);
    setIsSaving(true);

    try {
      await onSave(fullName, avatarFile, showName);
      setAvatarFile(null);
      setErrorMessage(null);
    } catch (error) {
      const err = error as Error;
      setErrorMessage(err.message || 'Failed to update profile.');
      console.error('Failed to update profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setAvatarFile(null);
    setFullName(String(profile?.full_name || ''));
    setShowName(savedShowName);
    setErrorMessage(null);
    onCancel();
  };

  // Check if there are any changes
  const hasChanges =
    fullName !== String(profile?.full_name || '') ||
    avatarFile !== null ||
    showName !== savedShowName;

  return (
    <Card className="h-full rounded-none border-none">
      <CardContent className="space-y-3">
        <div className="mb-4 flex flex-col gap-3">
          <div className="flex flex-row items-center justify-between px-1">
            <Label htmlFor="fullName" className="block font-normal">
              Display Name
            </Label>
            <span className="text-muted-foreground flex items-baseline gap-2 text-xs">
              <CharCount value={fullName} max={100} />
              {showName ? 'Visible on reports' : 'Hidden on reports'}
            </span>
          </div>
          <Input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
            maxLength={100}
            disabled={isSaving || isGuest}
          />
          <div className="flex flex-row items-center justify-between gap-3 px-1">
            <Label
              htmlFor="showNameOnReports"
              className="text-muted-foreground text-xs font-normal"
            >
              Show my name on my reports. When off, they show as
              &quot;Anonymous&quot;, including ones already sent.
            </Label>
            <Switch
              id="showNameOnReports"
              checked={showName}
              onCheckedChange={setShowName}
              disabled={isSaving || isGuest}
            />
          </div>
        </div>

        <div className="space-y-2">
          <ImageUploader
            onImageChange={(file) => setAvatarFile(file)}
            placeholder="Upload an Avatar"
            disabled={isGuest}
          />
          <div className="flex flex-row items-center gap-1">
            <span className="text-muted-foreground ml-1 items-center text-center text-xs">
              Most recent uploads are saved
            </span>
            <IconInfoCircleFilled className="h-3.5 w-3.5 cursor-help text-[#8D8D8D]/50 hover:text-[#8D8D8D]" />
          </div>
        </div>

        {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
        <div className="flex gap-3 pt-2">
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            className="flex-1"
            variant="outline"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
