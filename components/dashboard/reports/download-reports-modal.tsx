'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import client from '@/lib/supabase/client';

interface DownloadReportsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

// Generate years from 2020 to current year
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2019 }, (_, i) => ({
  value: String(currentYear - i),
  label: String(currentYear - i),
}));

export default function DownloadReportsModal({
  open,
  onOpenChange,
}: DownloadReportsModalProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCancel = () => {
    setSelectedMonth('');
    setSelectedYear('');
    setIsLoading(false);
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (!selectedMonth || !selectedYear) return;

    setIsLoading(true);

    try {
      // Build the download URL with month and year parameters
      const params = new URLSearchParams({
        month: selectedMonth,
        year: selectedYear,
      });

      // The route is staff-only and the session lives in the browser, so
      // the access token goes along explicitly.
      const {
        data: { session },
      } = await client.auth.getSession();

      const response = await fetch(
        `/api/reports/download?${params.toString()}`,
        {
          headers: session
            ? { Authorization: `Bearer ${session.access_token}` }
            : {},
        }
      );

      if (!response.ok) {
        // The route explains a refusal (not staff, bad month) in its body.
        const body = await response.json().catch(() => null);
        throw new Error(
          (body && typeof body.error === 'string' && body.error) ||
            `Download failed (HTTP ${response.status}).`
        );
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a download link and trigger the download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reports_${MONTHS.find((m) => m.value === selectedMonth)?.label}_${selectedYear}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Reset and close the modal
      handleCancel();
    } catch (error) {
      console.error('Download failed:', error);
      // It used to go back to the form without a word.
      toast.error(
        error instanceof Error ? error.message : 'The download failed.'
      );
      setIsLoading(false);
    }
  };

  const isFormValid = selectedMonth && selectedYear;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={!isLoading}
        onInteractOutside={(e) => {
          if (isLoading) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isLoading) e.preventDefault();
        }}
      >
        {isLoading ? (
          // Loading State
          <div
            role="status"
            className="flex min-h-50 flex-col items-center justify-center gap-4 py-8"
          >
            <Loader2
              aria-hidden="true"
              className="h-12 w-12 animate-spin text-[#5a87e7]"
            />
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">
                Preparing Download
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Please wait while we generate your report...
              </p>
            </div>
          </div>
        ) : (
          // Selection State
          <>
            <DialogHeader>
              <DialogTitle>Download Reports</DialogTitle>
              <DialogDescription>
                Select a month and year to download reports for that period.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Month Selection */}
                <div className="space-y-2">
                  <label
                    htmlFor="download-month"
                    className="text-sm font-medium text-gray-700"
                  >
                    Month
                  </label>
                  <Select
                    value={selectedMonth}
                    onValueChange={setSelectedMonth}
                  >
                    <SelectTrigger id="download-month" className="w-full">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Year Selection */}
                <div className="space-y-2">
                  <label
                    htmlFor="download-year"
                    className="text-sm font-medium text-gray-700"
                  >
                    Year
                  </label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger id="download-year" className="w-full">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((year) => (
                        <SelectItem key={year.value} value={year.value}>
                          {year.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-3 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="border-gray-300"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={!isFormValid}
                className="bg-[#5a87e7] hover:bg-[#4a77d7]"
              >
                Confirm
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
