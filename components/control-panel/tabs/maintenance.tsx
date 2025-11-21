"use client";

import { useState, useEffect, useCallback } from "react";
import {
  recordInletMaintenance,
  getInletMaintenanceHistory,
  recordManPipeMaintenance,
  getManPipeMaintenanceHistory,
  recordOutletMaintenance,
  getOutletMaintenanceHistory,
  recordStormDrainMaintenance,
  getStormDrainMaintenanceHistory,
} from "@/app/actions/clientMaintenanceActions";
import { fetchAllReports } from "@/lib/supabase/report";
import type { Report } from "@/lib/supabase/report";
import type { Inlet, Outlet, Pipe, Drain } from "../types";
import {
  CornerDownRight,
  MapPin,
  History,
  ChevronDown,
  Lock,
  Camera,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RefreshCw } from "lucide-react";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldContent } from "@/components/ui/field";
import ImageUploader from "@/components/image-uploader";
import { extractExifLocation } from "@/lib/report/extractEXIF";
import { useAuth } from "@/components/context/AuthProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { SpinnerEmpty } from "@/components/spinner-empty";
import distance from "@turf/distance";
import { point } from "@turf/helpers";
import client from "@/app/api/client";
import Image from "next/image";
import { format } from "date-fns";

const DEBUG_MODE = true; // Set to true to bypass EXIF/Location checks

type HistoryItem = {
  last_cleaned_at: string;
  agencies: { name: string }[] | null;
  profiles: { full_name: string }[] | null;
  status: string | null;
  addressed_report_id: string | null;
  description: string | null;
  evidence_image: string | null;
};

const assetActions = {
  inlets: {
    getHistory: getInletMaintenanceHistory,
    record: recordInletMaintenance,
  },
  man_pipes: {
    getHistory: getManPipeMaintenanceHistory,
    record: recordManPipeMaintenance,
  },
  outlets: {
    getHistory: getOutletMaintenanceHistory,
    record: recordOutletMaintenance,
  },
  storm_drains: {
    getHistory: getStormDrainMaintenanceHistory,
    record: recordStormDrainMaintenance,
  },
};

export type MaintenanceProps = {
  selectedInlet?: Inlet | null;
  selectedOutlet?: Outlet | null;
  selectedPipe?: Pipe | null;
  selectedDrain?: Drain | null;
  profile?: Record<string, unknown> | null;
};

const getStatusStyles = (status: string | null) => {
  switch (status) {
    case "resolved":
      return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
    case "in-progress":
      return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
    default:
      return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20";
  }
};

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
  const [_message, setMessage] = useState<string>("");
  const [history, setHistory] = useState<HistoryItem[] | null>(null);
  const [agencyComments, setAgencyComments] = useState<string>("");
  const [_reports, setReports] = useState<Report[]>([]);
  
  // Add Image / Report Submission State
  const { user, profile: authProfile } = useAuth();
  const [showIncludePhotoDialog, setShowIncludePhotoDialog] = useState(false);
  const [showFullPageUpload, setShowFullPageUpload] = useState(false);
  const [maintenanceImage, setMaintenanceImage] = useState<File | null>(null);
  const [maintenanceDescription, setMaintenanceDescription] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportStatus, setReportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [pendingStatus, setPendingStatus] = useState<"in-progress" | "resolved" | null>(null);

  const loadReports = useCallback(async (componentId: string) => {
    const allReports = await fetchAllReports();
    const assetReports = allReports.filter(
      (report) => report.componentId === componentId,
    );
    setReports(assetReports);
  }, []);

  const handleViewHistory = useCallback(async (assetType: string, assetId: string) => {
    setIsLoading(true);
    setMessage("");
    setHistory(null);

    const actions =
      assetActions[assetType as keyof typeof assetActions];
    if (!actions) {
      setMessage("Unknown asset type.");
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
      setMessage("No maintenance history found for this asset.");
    }
  }, []);

  useEffect(() => {
    let assetType = "";
    let assetId = "";

    if (selectedInlet) {
      assetType = "inlets";
      assetId = selectedInlet.id;
    } else if (selectedOutlet) {
      assetType = "outlets";
      assetId = selectedOutlet.id;
    } else if (selectedPipe) {
      assetType = "man_pipes";
      assetId = selectedPipe.id;
    } else if (selectedDrain) {
      assetType = "storm_drains";
      assetId = selectedDrain.id;
    }

    if (assetType && assetId) {
      setSelectedAsset({ type: assetType, id: assetId });
      handleViewHistory(assetType, assetId);
      loadReports(assetId);
    } else {
      setSelectedAsset(null);
      setHistory(null);
      setReports([]);
      setMessage("");
    }
    // Reset upload state when asset changes
    setMaintenanceImage(null);
    setMaintenanceDescription("");
    setShowFullPageUpload(false);
    setShowIncludePhotoDialog(false);
    setPendingStatus(null);
    setReportStatus(null);
  }, [selectedInlet, selectedOutlet, selectedPipe, selectedDrain, handleViewHistory, loadReports]);

  const initiateRecordMaintenance = (status: "in-progress" | "resolved") => {
    if(!selectedAsset) return;
    setPendingStatus(status);
    setShowIncludePhotoDialog(true);
  };

  const finalRecordMaintenance = async (status: "in-progress" | "resolved", imagePath?: string) => {
    if (!selectedAsset) {
      setMessage("No asset selected.");
      return;
    }
    setIsLoading(true);
    setMessage("");

    // Combine agency comments with specific image description if both exist
    let commentsToSubmit = agencyComments.trim();
    if (imagePath && maintenanceDescription.trim()) {
        commentsToSubmit = commentsToSubmit ? `${commentsToSubmit}\n\n[Photo Note]: ${maintenanceDescription}` : maintenanceDescription;
    } else if (commentsToSubmit === "") {
         commentsToSubmit = "";
    }

    const { type, id } = selectedAsset;
    const actions = assetActions[type as keyof typeof assetActions];
    if (!actions) {
      setMessage("Unknown asset type.");
      setIsLoading(false);
      return;
    }

    const result = await actions.record(id, status, commentsToSubmit, imagePath);

    setIsLoading(false);
    setShowIncludePhotoDialog(false);
    setShowFullPageUpload(false);
    setPendingStatus(null);
    setMaintenanceImage(null);
    setMaintenanceDescription("");


    if (result.error) {
      setReportStatus({ type: 'error', message: `Error: ${result.error}` });
      setMessage(`Error: ${result.error}`);
    } else {
      setMessage(`Maintenance recorded successfully as ${status}.`);
      handleViewHistory(type, id);
      loadReports(id);
    }
  };

  const handleMaintenanceImageSubmit = async () => {
    if (!maintenanceImage || !selectedAsset || !pendingStatus) return;
    
    setIsSubmittingReport(true);
    setReportStatus(null);

    try {
      // 1. Extract EXIF Data
      const exifData = await extractExifLocation(maintenanceImage);
      
      // DEBUG MODE: Bypass Validation
      if (!DEBUG_MODE) {
          // Validate Date (Must be within last 12 hours)
          if (!exifData.date) {
             throw new Error("Could not retrieve date from image. Ensure the image has EXIF data.");
          }
          
          const now = new Date();
          const imageDate = exifData.date;
          const diffMs = now.getTime() - imageDate.getTime();
          const hoursDiff = diffMs / (1000 * 60 * 60);
          
          if (hoursDiff > 12) {
            throw new Error("Image is too old. Must be taken within 12 hours.");
          }
           if (hoursDiff < 0) { 
             throw new Error("Image appears to be from the future. Check device settings.");
          }
    
    
          // Validate Location
          if (!exifData.latitude || !exifData.longitude) {
            throw new Error("Could not retrieve coordinates from image.");
          }
    
          // Get selected asset coordinates
          let assetCoords: [number, number] | null = null;
          if (selectedInlet) assetCoords = selectedInlet.coordinates;
          else if (selectedOutlet) assetCoords = selectedOutlet.coordinates;
          else if (selectedDrain) assetCoords = selectedDrain.coordinates;
          else if (selectedPipe && selectedPipe.coordinates.length > 0) {
             assetCoords = selectedPipe.coordinates[0]; 
          }
          
          if (!assetCoords) {
            throw new Error("Could not determine asset location.");
          }
    
          const from = point([exifData.longitude, exifData.latitude]);
          const to = point([assetCoords[0], assetCoords[1]]); 
          const distKm = distance(from, to);
          const distMeters = distKm * 1000;
          
          const MAX_RADIUS_METERS = 50;
          let isWithinRadius = distMeters <= MAX_RADIUS_METERS;
          
          if (selectedPipe && !isWithinRadius) {
              for (const coord of selectedPipe.coordinates) {
                  const pipePt = point([coord[0], coord[1]]);
                  const d = distance(from, pipePt) * 1000;
                  if (d <= MAX_RADIUS_METERS) {
                      isWithinRadius = true;
                      break;
                  }
              }
          }
          
          if (!isWithinRadius) {
            throw new Error(`Image location is too far from the selected asset (${distMeters.toFixed(0)}m). Must be within ${MAX_RADIUS_METERS}m.`);
          }
      }

      // 2. Upload Image to 'ReportImage' bucket
      const fileExt = maintenanceImage.name.split('.').pop();
      const fileName = `${selectedAsset.type}_${selectedAsset.id}_${Date.now()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await client.storage
        .from("ReportImage")
        .upload(filePath, maintenanceImage);

      if (uploadError) {
        throw new Error(`Image upload failed: ${uploadError.message}`);
      }
      
      // 3. Record Maintenance with Image Path
      await finalRecordMaintenance(pendingStatus, filePath);

    } catch (error: any) {
      setReportStatus({ type: 'error', message: error.message || "Submission failed" });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Check if user is admin
  const isAdmin = !!profile?.agency_id;

  // If not admin, show admin privileges message
  if (!isAdmin) {
    return (
      <div className="flex flex-col pl-5 pr-2.5 h-full overflow-y-auto maintenance-scroll-hidden">
        <div className="flex-1 overflow-y-auto pt-3 px-3 maintenance-scroll-hidden">
          <CardHeader className="py-0 flex px-1 mb-6 items-center justify-between">
            <div className="flex flex-col gap-1.5">
              <CardTitle>Maintenance History</CardTitle>
              <CardDescription className="text-xs">
                {selectedAsset
                  ? `Displaying ${selectedAsset.id.slice(
                      0,
                      8
                    )} from ${selectedAsset.type.replace(/_/g, " ")}`
                  : "Select an asset to view details"}
              </CardDescription>
            </div>
            <button
              className="w-8 h-8 bg-[#EBEBEB] border border-[#DCDCDC] rounded-full flex items-center justify-center transition-colors hover:bg-[#E0E0E0] disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh reports"
              disabled
            >
              <RefreshCw className="w-4 h-4 text-[#8D8D8D]" />
            </button>
          </CardHeader>

          <div className="flex flex-col flex-1">
            <div className="relative h-full min-h-[350px]">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center items-center flex flex-col">
                  <div className="w-12 h-12 flex justify-center items-center bg-[#EBEBEB] border border-[#DCDCDC] rounded-full  mb-3">
                    <Lock className="self-center w-6 h-6 text-[#8D8D8D]" />
                  </div>

                  <p className="text-sm font-medium text-gray-900">
                    Admin Privileges Required
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
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
    <div className="relative flex flex-col pl-2 h-full overflow-y-auto maintenance-scroll-hidden">
      <div className="flex-1 overflow-y-auto pt-3 pb-20 px-3 maintenance-scroll-hidden">
        <CardHeader className="py-0 flex px-1 mb-6 items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Maintenance History</CardTitle>
            <CardDescription className="text-xs">
              {selectedAsset
                ? `Displaying ${selectedAsset.id.slice(
                    0,
                    8
                  )} from ${selectedAsset.type.replace(/_/g, " ")}`
                : "Select an asset to view details"}
            </CardDescription>
          </div>
          <button
            className="w-8 h-8 bg-[#EBEBEB] border border-[#DCDCDC] rounded-full flex items-center justify-center transition-colors hover:bg-[#E0E0E0] disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh reports"
          >
            <RefreshCw className="w-4 h-4 text-[#8D8D8D]" />
          </button>
        </CardHeader>

        <div className="flex flex-col flex-1">
          <div className="relative h-full min-h-[350px]">
            {!selectedAsset ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center items-center flex flex-col">
                  <div className="w-12 h-12 flex justify-center items-center bg-[#EBEBEB] border border-[#DCDCDC] rounded-full  mb-3">
                    <MapPin className="self-center w-6 h-6 text-[#8D8D8D]" />
                  </div>

                  <p className="text-sm font-medium text-gray-900">
                    No Asset Selected
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Select an asset on the map
                  </p>
                </div>
              </div>
            ) : isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center flex flex-col items-center">
                  <div className="w-12 h-12 flex justify-center items-center bg-[#EBEBEB] border border-[#DCDCDC] rounded-full  mb-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    Loading...
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
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
                            .from("ReportImage")
                            .getPublicUrl(record.evidence_image);
                         const imageUrl = imgData.publicUrl;

                        return (
                          <div
                            key={index}
                            className="flex flex-row gap-3 border rounded-lg p-3 hover:bg-accent transition-colors cursor-pointer"
                          >
                            <div className="flex items-start gap-3 w-full">
                              {/* Image Thumbnail */}
                              <div className="shrink-0">
                                  <Image
                                    src={imageUrl}
                                    alt="Maintenance Evidence"
                                    width={80}
                                    height={80}
                                    className="w-20 h-20 object-cover rounded border border-gray-100"
                                    unoptimized
                                  />
                              </div>

                              {/* Details */}
                              <div className="flex-1 flex flex-col gap-2 min-w-0">
                                <div>
                                  <div className="flex items-start justify-between">
                                     <p className="text-sm font-medium text-foreground">
                                        {record.profiles?.[0]?.full_name || "Unknown Agent"}
                                     </p>
                                  </div>

                                  {record.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                        {record.description}
                                    </p>
                                  )}

                                  <div className="flex flex-col gap-1 mt-1 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                       <CornerDownRight className="w-3 h-3" />
                                       <span>{record.agencies?.[0]?.name || "N/A"}</span>
                                    </div>
                                    <div>
                                      {format(new Date(record.last_cleaned_at), "MMM dd, yyyy • HH:mm")}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-row gap-2 mt-auto">
                                  {record.status && (
                                      <div
                                        className={`text-[10px] px-2 py-0.5 h-5 rounded-md border flex items-center justify-center ${getStatusStyles(
                                          record.status
                                        )}`}
                                      >
                                        {record.status}
                                      </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                    }

                    // Regular Style (No Image)
                    return (
                      <div
                        key={index}
                        className="flex flex-row gap-3 border rounded-lg p-3 hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start gap-3 w-full">
                          <div className="flex-1 flex flex-col gap-2 min-w-0">
                            <div>
                              <div className="flex items-start justify-between">
                                <p className="text-sm font-medium text-foreground">
                                  {record.profiles?.[0]?.full_name || "Unknown Agent"}
                                </p>
                              </div>

                              {record.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                    {record.description}
                                </p>
                              )}

                              <div className="flex flex-col gap-1 mt-1 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                   <CornerDownRight className="w-3 h-3" />
                                   <span>{record.agencies?.[0]?.name || "N/A"}</span>
                                </div>
                                <div>
                                  {format(new Date(record.last_cleaned_at), "MMM dd, yyyy • HH:mm")}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-row gap-2 mt-auto">
                              {record.status && (
                                <div
                                  className={`text-[10px] px-2 py-0.5 h-5 rounded-md border flex items-center justify-center ${getStatusStyles(
                                    record.status
                                  )}`}
                                >
                                  {record.status}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                })}
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center items-center flex flex-col">
                  <div className="w-12 h-12 flex justify-center items-center bg-[#EBEBEB] border border-[#DCDCDC] rounded-full  mb-3">
                    <History className="self-center w-6 h-6 text-[#8D8D8D]" />
                  </div>

                  <p className="text-sm font-medium text-gray-900">
                    Empty History
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
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
        <div className="px-3 pb-5 pt-0">
          <Field className="mb-4">
            <FieldContent>
              <Textarea
                value={agencyComments}
                onChange={(e) => setAgencyComments(e.target.value)}
                placeholder="Agency Comments Here"
                rows={1}
                style={{ height: "56px", minHeight: "56px", maxHeight: "56px" }}
                className="resize-none bg-transparent !h-14"
              />
            </FieldContent>
          </Field>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={isLoading || !selectedAsset}
                className="w-full h-11 rounded-lg bg-[#4b72f3] border border-[#2b3ea7] text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-0 flex items-center justify-between"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2  mx-auto">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span className="text-sm">Recording...</span>
                  </span>
                ) : (
                  <>
                    <span className="text-sm px-3">Record Maintenance</span>
                    <ChevronDown className="h-4 w-4 ml-2" />
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
                onClick={() => initiateRecordMaintenance("in-progress")}
                className="cursor-pointer focus:bg-blue-50"
              >
                <div className="flex items-center gap-3 w-full">
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
                onClick={() => initiateRecordMaintenance("resolved")}
                className="cursor-pointer focus:bg-green-50"
              >
                <div className="flex items-center gap-3 w-full">
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
      <Dialog open={showIncludePhotoDialog} onOpenChange={setShowIncludePhotoDialog}>
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
                    if(pendingStatus) finalRecordMaintenance(pendingStatus);
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
        <div className="absolute inset-0 z-50 bg-background flex flex-col">
          {isSubmittingReport ? (
              <SpinnerEmpty emptyTitle="Verifying & Submitting" emptyDescription="Checking location and time..." />
          ) : (
            <div className="flex flex-col h-full p-4 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-semibold">Add Maintenance Photo</h2>
                        <p className="text-sm text-muted-foreground">
                            Verifying location and time (12h window)
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setShowFullPageUpload(false)}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="space-y-4 flex-1">
                    {reportStatus && (
                        <div className={`p-3 rounded-md flex items-start gap-2 text-sm ${reportStatus.type === 'error' ? 'bg-red-50 text-red-900' : 'bg-green-50 text-green-900'}`}>
                            {reportStatus.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0 text-red-600"/> : <CheckCircle2 className="w-5 h-5 shrink-0 text-green-600"/>}
                            <span>{reportStatus.message}</span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Photo Evidence</label>
                        <ImageUploader onImageChange={setMaintenanceImage} image={maintenanceImage} />
                        <p className="text-xs text-muted-foreground">
                            * Photo must contain GPS data and be taken within the last 12 hours.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                         <Textarea
                            value={maintenanceDescription}
                            onChange={(e) => setMaintenanceDescription(e.target.value)}
                            placeholder="Describe the photo or work done..."
                            rows={4}
                            className="resize-none"
                        />
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t">
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
