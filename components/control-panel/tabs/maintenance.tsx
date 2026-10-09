'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DEBUG_MODE,
  checkMaintenancePhoto,
  unverifiedNote,
  getStatusStyles,
  type HistoryItem,
} from './maintenance.helpers';
import { assetActions } from './maintenance.actions';
import MaintenanceVerification from './maintenance-verification';
import type { Inlet, Outlet, Pipe, Drain } from '../types';
import {
  CornerDownRight,
  MapPin,
  History,
  ChevronDown,
  Lock,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RefreshCw } from 'lucide-react';
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldContent } from '@/components/ui/field';
import ImageUploader from '@/components/common/image-uploader';
import { extractExifLocation } from '@/lib/reports/extract-exif';
import { sanitizeImage } from '@/lib/reports/sanitize-image';
import { useAuth } from '@/components/context/auth-provider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { SpinnerEmpty } from '@/components/common/spinner-empty';
import { toast } from 'sonner';
import distance from '@turf/distance';
import { point } from '@turf/helpers';

/** Great-circle distance between two [lng, lat] pairs, in metres. */
const measureDistanceM = (
  from: [number, number],
  to: [number, number]
): number => distance(point(from), point(to)) * 1000;
import client from '@/lib/supabase/client';
import Image from 'next/image';
import { format } from 'date-fns';
import { componentTypeLabel, statusLabel } from '@/lib/reports/display-labels';

export type MaintenanceProps = {
  selectedInlet?: Inlet | null;
  selectedOutlet?: Outlet | null;
  selectedPipe?: Pipe | null;
  selectedDrain?: Drain | null;
  profile?: Record<string, unknown> | null;
};

/**
 * Maintenance tab rendered inside the `/map` and `/simulation` control
 * panels. Lets agency-linked users record cleaning / repair events against a
 * selected drainage asset (inlet, outlet, pipe, storm drain) — including an
 * EXIF-validated evidence photo — and shows the asset's maintenance history.
 *
 * Renders an "Admin Privileges Required" empty state for visitors that lack
 * an `agency_id` on their profile.
 */
export default function Maintenance({
  selectedInlet,
  selectedOutlet,
  selectedPipe,
  selectedDrain,
  profile,
}: MaintenanceProps) {
  const [selectedAsset, setSelectedAsset] = useState<{
    type: string;
    id: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [_message, setMessage] = useState<string>('');
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [agencyComments, setAgencyComments] = useState<string>('');

  // Add Image / Report Submission State
  const { user: _user, profile: _authProfile } = useAuth();
  const [showIncludePhotoDialog, setShowIncludePhotoDialog] = useState(false);
  const [showFullPageUpload, setShowFullPageUpload] = useState(false);
  const [maintenanceImage, setMaintenanceImage] = useState<File | null>(null);
  const [maintenanceDescription, setMaintenanceDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportStatus, setReportStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [pendingStatus, setPendingStatus] = useState<
    'in-progress' | 'resolved' | null
  >(null);

  const handleViewHistory = useCallback(
    async (assetType: string, assetId: string) => {
      setIsLoading(true);
      setMessage('');
      setHistory(null);

      const actions = assetActions[assetType as keyof typeof assetActions];
      if (!actions) {
        setMessage('Unknown asset type.');
        setIsLoading(false);
        return;
      }

      const result = await actions.getHistory(assetId);

      setIsLoading(false);

      if (result.error) {
        setMessage(`Error fetching history: ${result.error}`);
      } else if (result.data && (result.data as HistoryItem[]).length > 0) {
        setHistory(result.data as HistoryItem[]);
      } else {
        setMessage('No maintenance history found for this asset.');
      }
    },
    []
  );

  useEffect(() => {
    let assetType = '';
    let assetId = '';

    if (selectedInlet) {
      assetType = 'inlets';
      assetId = selectedInlet.id;
    } else if (selectedOutlet) {
      assetType = 'outlets';
      assetId = selectedOutlet.id;
    } else if (selectedPipe) {
      assetType = 'man_pipes';
      assetId = selectedPipe.id;
    } else if (selectedDrain) {
      assetType = 'storm_drains';
      assetId = selectedDrain.id;
    }

    if (assetType && assetId) {
      setSelectedAsset({ type: assetType, id: assetId });
      handleViewHistory(assetType, assetId);
    } else {
      setSelectedAsset(null);
      setHistory(null);
      setMessage('');
    }
    // Reset upload state when asset changes
    setMaintenanceImage(null);
    setMaintenanceDescription('');
    setShowFullPageUpload(false);
    setShowIncludePhotoDialog(false);
    setPendingStatus(null);
    setReportStatus(null);
  }, [
    selectedInlet,
    selectedOutlet,
    selectedPipe,
    selectedDrain,
    handleViewHistory,
  ]);

  const initiateRecordMaintenance = (status: 'in-progress' | 'resolved') => {
    if (!selectedAsset) return;
    setPendingStatus(status);
    setShowIncludePhotoDialog(true);
  };

  const finalRecordMaintenance = async (
    status: 'in-progress' | 'resolved',
    imagePath?: string,
    unverifiedReason?: string
  ) => {
    if (!selectedAsset) {
      setMessage('No asset selected.');
      return;
    }
    setIsLoading(true);
    setMessage('');

    // Combine agency comments with specific image description if both exist
    let commentsToSubmit = agencyComments.trim();
    if (imagePath && maintenanceDescription.trim()) {
      commentsToSubmit = commentsToSubmit
        ? `${commentsToSubmit}\n\n[Photo Note]: ${maintenanceDescription}`
        : maintenanceDescription;
    } else if (commentsToSubmit === '') {
      commentsToSubmit = '';
    }

    // Recorded on the entry itself, so a reviewer can see which evidence
    // was checked and which merely could not be.
    if (unverifiedReason) {
      const note = unverifiedNote(unverifiedReason);
      commentsToSubmit = commentsToSubmit
        ? `${commentsToSubmit}

${note}`
        : note;
    }

    const { type, id } = selectedAsset;
    const actions = assetActions[type as keyof typeof assetActions];
    if (!actions) {
      setMessage('Unknown asset type.');
      setIsLoading(false);
      return;
    }

    const result = await actions.record(
      id,
      status,
      commentsToSubmit,
      imagePath
    );

    setIsLoading(false);
    setShowIncludePhotoDialog(false);
    setShowFullPageUpload(false);
    setPendingStatus(null);
    setMaintenanceImage(null);
    setMaintenanceDescription('');

    // A toast, because the upload view that could show a message has just
    // closed: failures (and successes) used to pass without a word.
    if (result.error) {
      toast.error(`Could not record the maintenance: ${result.error}`);
    } else {
      toast.success(
        status === 'resolved'
          ? 'Recorded as fixed. Someone other than you can now confirm it.'
          : 'Recorded as in progress.'
      );
      handleViewHistory(type, id);
    }
  };

  /**
   * Every point the evidence photo may be measured against. A node has one;
   * a pipe has its whole run, since a photo anywhere along it is valid.
   */
  const assetCoordinates = (): [number, number][] => {
    if (selectedInlet) return [selectedInlet.coordinates];
    if (selectedOutlet) return [selectedOutlet.coordinates];
    if (selectedDrain) return [selectedDrain.coordinates];
    if (selectedPipe) return selectedPipe.coordinates;
    return [];
  };

  const handleMaintenanceImageSubmit = async () => {
    if (!maintenanceImage || !selectedAsset || !pendingStatus) return;

    setIsSubmittingReport(true);
    setReportStatus(null);

    try {
      // 1. Extract EXIF Data
      const exifData = await extractExifLocation(maintenanceImage);

      // The photo is only turned away when its own metadata contradicts
      // the claim. When there is simply nothing to check -- a stripped
      // EXIF block, which is the common case for a shared photo -- the
      // submission goes through marked unverified.
      let unverifiedReason: string | undefined;
      if (!DEBUG_MODE) {
        const check = checkMaintenancePhoto(
          exifData,
          assetCoordinates(),
          measureDistanceM
        );
        if (check.outcome === 'rejected') {
          throw new Error(check.reason);
        }
        if (check.outcome === 'unverifiable') {
          unverifiedReason = check.reason;
          toast.warning(check.reason);
        }
      }

      // 2. Upload Image to 'ReportImage' bucket
      // public/<uuid>.<ext>: the only name the bucket's upload policy
      // accepts (schema_auth_storage.sql).
      // The bucket is public: upload a re-encoded copy with no EXIF (GPS,
      // device), as reports do. The location was read from the original above.
      const cleanImage = await sanitizeImage(maintenanceImage);
      const filePath = `public/${crypto.randomUUID()}.jpg`;

      const { error: uploadError } = await client.storage
        .from('ReportImage')
        .upload(filePath, cleanImage, { contentType: cleanImage.type });

      if (uploadError) {
        throw new Error(`Image upload failed: ${uploadError.message}`);
      }

      // 3. Record Maintenance with Image Path
      await finalRecordMaintenance(pendingStatus, filePath, unverifiedReason);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Submission failed';
      setReportStatus({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Check if user is admin
  const isAdmin = !!profile?.agency_id;

  // If not admin, show admin privileges message
  if (!isAdmin) {
    return (
      <div className="maintenance-scroll-hidden flex h-full flex-col overflow-y-auto pr-2.5 pl-5">
        <div className="maintenance-scroll-hidden flex-1 overflow-y-auto px-3 pt-3">
          <CardHeader className="mb-6 flex items-center justify-between px-1 py-0">
            <div className="flex flex-col gap-1.5">
              <CardTitle>Maintenance History</CardTitle>
              <CardDescription className="text-xs">
                {selectedAsset
                  ? `Displaying ${selectedAsset.id.slice(
                      0,
                      8
                    )} from ${componentTypeLabel(selectedAsset.type)}`
                  : 'Select an asset to view details'}
              </CardDescription>
            </div>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#DCDCDC] bg-[#EBEBEB] transition-colors hover:bg-[#E0E0E0] disabled:cursor-not-allowed disabled:opacity-50"
              title="Refresh reports"
              disabled
            >
              <RefreshCw className="h-4 w-4 text-[#8D8D8D]" />
            </button>
          </CardHeader>

          <div className="flex flex-1 flex-col">
            <div className="relative h-full min-h-[350px]">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#DCDCDC] bg-[#EBEBEB]">
                    <Lock className="h-6 w-6 self-center text-[#8D8D8D]" />
                  </div>

                  <p className="text-sm font-medium text-gray-900">
                    Admin Privileges Required
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Link an agency account for access
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="maintenance-scroll-hidden relative flex h-full flex-col overflow-y-auto pl-2">
      <div className="maintenance-scroll-hidden flex-1 overflow-y-auto px-3 pt-3 pb-20">
        <CardHeader className="mb-6 flex items-center justify-between px-1 py-0">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Maintenance History</CardTitle>
            <CardDescription className="text-xs">
              {selectedAsset
                ? `Displaying ${selectedAsset.id.slice(
                    0,
                    8
                  )} from ${selectedAsset.type.replace(/_/g, ' ')}`
                : 'Select an asset to view details'}
            </CardDescription>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#DCDCDC] bg-[#EBEBEB] transition-colors hover:bg-[#E0E0E0] disabled:cursor-not-allowed disabled:opacity-50"
            title="Refresh reports"
            disabled={!selectedAsset || isLoading}
            onClick={() => {
              if (!selectedAsset) return;
              handleViewHistory(selectedAsset.type, selectedAsset.id);
            }}
          >
            <RefreshCw className="h-4 w-4 text-[#8D8D8D]" />
          </button>
        </CardHeader>

        <div className="flex flex-1 flex-col">
          <div className="relative h-full min-h-[350px]">
            {!selectedAsset ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#DCDCDC] bg-[#EBEBEB]">
                    <MapPin className="h-6 w-6 self-center text-[#8D8D8D]" />
                  </div>

                  <p className="text-sm font-medium text-gray-900">
                    No Asset Selected
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Select an asset on the map
                  </p>
                </div>
              </div>
            ) : isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  role="status"
                  className="flex flex-col items-center text-center"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#DCDCDC] bg-[#EBEBEB]">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    Loading...
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Fetching the maintenance history
                  </p>
                </div>
              </div>
            ) : history && history.length > 0 ? (
              <div className="space-y-2 overflow-y-auto">
                {history.map((record, index) => {
                  // Conditional Rendering: Report Style vs Regular Style
                  if (record.evidence_image) {
                    const { data: imgData } = client.storage
                      .from('ReportImage')
                      .getPublicUrl(record.evidence_image);
                    const imageUrl = imgData.publicUrl;

                    return (
                      <div
                        key={index}
                        className="hover:bg-accent flex cursor-pointer flex-row gap-3 rounded-lg border p-3 transition-colors"
                      >
                        <div className="flex w-full items-start gap-3">
                          {/* Image Thumbnail */}
                          <div className="shrink-0">
                            <Image
                              src={imageUrl}
                              alt="Maintenance Evidence"
                              width={80}
                              height={80}
                              className="h-20 w-20 rounded border border-gray-100 object-cover"
                              unoptimized
                            />
                          </div>

                          {/* Details */}
                          <div className="flex min-w-0 flex-1 flex-col gap-2">
                            <div>
                              <div className="flex items-start justify-between">
                                <p className="text-foreground text-sm font-medium">
                                  {record.profiles?.[0]?.full_name ||
                                    'Unknown Agent'}
                                </p>
                              </div>

                              {record.description && (
                                <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                                  {record.description}
                                </p>
                              )}

                              <div className="text-muted-foreground mt-1 flex flex-col gap-1 text-xs">
                                <div className="flex items-center gap-1">
                                  <CornerDownRight className="h-3 w-3" />
                                  <span>
                                    {record.agencies?.[0]?.name || 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  {format(
                                    new Date(record.last_cleaned_at),
                                    'MMM dd, yyyy • HH:mm'
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="mt-auto flex flex-row gap-2">
                              {record.status && (
                                <div
                                  className={`flex h-5 items-center justify-center rounded-md border px-2 py-0.5 text-[10px] ${getStatusStyles(
                                    record.status
                                  )}`}
                                >
                                  {statusLabel(record.status)}
                                </div>
                              )}
                            </div>
                            <MaintenanceVerification
                              record={record}
                              onChanged={() =>
                                selectedAsset &&
                                handleViewHistory(
                                  selectedAsset.type,
                                  selectedAsset.id
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Regular Style (No Image)
                  return (
                    <div
                      key={index}
                      className="hover:bg-accent flex flex-row gap-3 rounded-lg border p-3 transition-colors"
                    >
                      <div className="flex w-full items-start gap-3">
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          <div>
                            <div className="flex items-start justify-between">
                              <p className="text-foreground text-sm font-medium">
                                {record.profiles?.[0]?.full_name ||
                                  'Unknown Agent'}
                              </p>
                            </div>

                            {record.description && (
                              <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                                {record.description}
                              </p>
                            )}

                            <div className="text-muted-foreground mt-1 flex flex-col gap-1 text-xs">
                              <div className="flex items-center gap-1">
                                <CornerDownRight className="h-3 w-3" />
                                <span>
                                  {record.agencies?.[0]?.name || 'N/A'}
                                </span>
                              </div>
                              <div>
                                {format(
                                  new Date(record.last_cleaned_at),
                                  'MMM dd, yyyy • HH:mm'
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-auto flex flex-row gap-2">
                            {record.status && (
                              <div
                                className={`flex h-5 items-center justify-center rounded-md border px-2 py-0.5 text-[10px] ${getStatusStyles(
                                  record.status
                                )}`}
                              >
                                {statusLabel(record.status)}
                              </div>
                            )}
                          </div>
                          <MaintenanceVerification
                            record={record}
                            onChanged={() =>
                              selectedAsset &&
                              handleViewHistory(
                                selectedAsset.type,
                                selectedAsset.id
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#DCDCDC] bg-[#EBEBEB]">
                    <History className="h-6 w-6 self-center text-[#8D8D8D]" />
                  </div>

                  <p className="text-sm font-medium text-gray-900">
                    Empty History
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    No maintenance records yet
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky bottom section - updated positioning */}
      {selectedAsset && (
        <div className="px-3 pt-0 pb-5">
          <Field className="mb-4">
            <FieldContent>
              <Textarea
                value={agencyComments}
                onChange={(e) => setAgencyComments(e.target.value)}
                placeholder="Agency Comments Here"
                aria-label="Agency comments"
                rows={1}
                style={{ height: '56px', minHeight: '56px', maxHeight: '56px' }}
                className="!h-14 resize-none bg-transparent"
              />
            </FieldContent>
          </Field>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={isLoading || !selectedAsset}
                className="flex h-11 w-full min-w-0 items-center justify-between rounded-lg border border-[#2b3ea7] bg-[#4b72f3] text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="mx-auto flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span className="text-sm">Recording...</span>
                  </span>
                ) : (
                  <>
                    <span className="px-3 text-sm">Record Maintenance</span>
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs font-semibold text-gray-700">
                Select Status
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => initiateRecordMaintenance('in-progress')}
                className="cursor-pointer focus:bg-blue-50"
              >
                <div className="flex w-full items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      In Progress
                    </p>
                    <p className="text-xs text-gray-500">Work is ongoing</p>
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => initiateRecordMaintenance('resolved')}
                className="cursor-pointer focus:bg-green-50"
              >
                <div className="flex w-full items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      Resolved
                    </p>
                    <p className="text-xs text-gray-500">Work is complete</p>
                  </div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Add Image Confirmation Dialog */}
      <Dialog
        open={showIncludePhotoDialog}
        onOpenChange={setShowIncludePhotoDialog}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Include a photo with this log?</DialogTitle>
            <DialogDescription>
              Do you want to add photo evidence to this maintenance record?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (pendingStatus) finalRecordMaintenance(pendingStatus);
                }}
                className="flex-1"
              >
                No
              </Button>
              <Button
                onClick={() => {
                  setShowIncludePhotoDialog(false);
                  setShowFullPageUpload(true);
                }}
                className="flex-1 bg-[#4b72f3]"
              >
                Yes, Add Photo
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Page Upload View */}
      {showFullPageUpload && (
        <div className="bg-background absolute inset-0 z-50 flex flex-col">
          {isSubmittingReport ? (
            <SpinnerEmpty
              emptyTitle="Verifying & Submitting"
              emptyDescription="Checking location and time..."
            />
          ) : (
            <div className="flex h-full flex-col overflow-y-auto p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    Add Maintenance Photo
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Verifying location and time (12h window)
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowFullPageUpload(false)}
                  aria-label="Close"
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex-1 space-y-4">
                {reportStatus && (
                  <div
                    className={`flex items-start gap-2 rounded-md p-3 text-sm ${reportStatus.type === 'error' ? 'bg-red-50 text-red-900' : 'bg-green-50 text-green-900'}`}
                  >
                    {reportStatus.type === 'error' ? (
                      <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                    )}
                    <span>{reportStatus.message}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Photo Evidence</label>
                  <ImageUploader
                    onImageChange={setMaintenanceImage}
                    image={maintenanceImage}
                  />
                  <p className="text-muted-foreground text-xs">
                    * The photo&apos;s own location and time are checked: one
                    taken more than 50 m from the asset or over 12 hours ago is
                    refused. A photo without them is accepted but marked
                    unverified.
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="maintenance-photo-description"
                    className="text-sm font-medium"
                  >
                    Description
                  </label>
                  <Textarea
                    id="maintenance-photo-description"
                    value={maintenanceDescription}
                    onChange={(e) => setMaintenanceDescription(e.target.value)}
                    placeholder="Describe the photo or work done..."
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </div>

              <div className="mt-4 border-t pt-4">
                <Button
                  className="w-full bg-[#4b72f3] hover:bg-blue-600"
                  onClick={handleMaintenanceImageSubmit}
                  disabled={!maintenanceImage}
                >
                  Submit Log
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
