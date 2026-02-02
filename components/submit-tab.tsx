'use client';

import { useState } from 'react';
import ImageUploader from './image-uploader';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { uploadReport } from '@/lib/supabase/report';
import { extractExifLocation } from '@/lib/report/extractEXIF';
import { getClosestPipes } from '@/lib/report/getClosestPipe';
import { useAuth } from '@/components/context/AuthProvider';
import { ComboboxForm } from './combobox-form';
import type { ComboboxOption } from './combobox-form';
import { Field, FieldContent } from './ui/field';
import { Textarea } from './ui/textarea';
import { CardDescription, CardHeader, CardTitle } from './ui/card';
import { SpinnerEmpty } from './spinner-empty';
import { AlertCircle, CheckCircle2Icon } from 'lucide-react';
import { AlertTitle } from '@/components/ui/alert';
import client from '@/app/api/client';

interface CategoryData {
  name: string;
  lat: number;
  long: number;
  distance?: number;
}

export default function SubmitTab() {
  const { user, profile } = useAuth();
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [manualAccepted, setManualAccepted] = useState(false);
  const [categoryLabel, setCategoryLabel] = useState('');
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [comboOption, setComboOptions] = useState<ComboboxOption[]>([]);
  const [category, setCategory] = useState('');
  const [categoryIndex, setCategoryIndex] = useState(-1);
  const [errorCode, setErrorCode] = useState('');
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const [alertNow, setAlertNow] = useState(false);
  const isDisabled = isManual
    ? !manualAccepted || !termsAccepted || categoryIndex < 0
    : !termsAccepted || categoryIndex < 0;

  const handleCategory = (value: string) => {
    setCategory(value);

    if (value === 'inlets') {
      setCategoryLabel('Inlet');
    } else if (value === 'storm_drains') {
      setCategoryLabel('Storm Drain');
    } else if (value === 'man_pipes') {
      setCategoryLabel('Manduae Pipe');
    } else if (value === 'outlets') {
      setCategoryLabel('Outlet');
    }
  };

  const clearInputs = () => {
    setDescription('');
    setImage(null);
    setCategory('');
    setCategoryLabel('');
    setCategoryData([]);
    setCategoryIndex(0);
  };

  const handlePreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!image) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsSubmitting(false);
      setIsErrorModalOpen(true);
      setErrorCode('Not a valid image');
    } else {
      const location = await extractExifLocation(image);
      // const location = {
      //   latitude: 10.360832542295604,
      //   longitude: 123.927200298236968,
      // };
      //need to fix bug
      // console.log("Extracted Location:", location);
      if (!location.latitude || !location.longitude) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsSubmitting(false);
        setIsErrorModalOpen(true);
        setErrorCode('No GPS data found in image');
        return;
      }

      //mock location for testing yes
      //const location = { latitude: 10.3263275618157, longitude: 123.925696045157 };

      try {
        const Pipedata = await getClosestPipes(
          { lat: location.latitude, lon: location.longitude },
          category
        );

        if (Pipedata.length === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          setIsSubmitting(false);
          setIsErrorModalOpen(true);
          setErrorCode('No component found within your location!');
          return;
        }

        const options: ComboboxOption[] = Pipedata.map((item, index) => ({
          value: index.toString(),
          label:
            index === 0
              ? item.name +
                '    - ' +
                item.distance.toFixed(0) +
                'm away (BEST MATCH)'
              : item.name + '    - ' + item.distance.toFixed(0) + 'm away',
        }));
        setComboOptions(options);

        // console.log("Closest Pipes:", Pipedata);
        setCategoryData(Pipedata);
        setIsModalOpen(true);
        setIsSubmitting(false);
        return;
      } catch (error) {
        setIsErrorModalOpen(true);
        setErrorCode(String(error));
        setIsSubmitting(false);
        return;
      }
    }
  };

  const handleConfirmSubmit = async () => {
    setIsConfirming(true);

    try {
      const userID = user?.id ?? null;
      const profileName = profile?.full_name ?? 'Anonymous';

      const long = categoryData[categoryIndex].long;
      const lat = categoryData[categoryIndex].lat;
      const component_id = categoryData[categoryIndex].name;

      await uploadReport(
        image!,
        category,
        description,
        component_id,
        long,
        lat,
        userID,
        profileName
      );

      // Show alert
      setAlertNow(true);

      // Wait 1 second before closing everything
      setTimeout(() => {
        setAlertNow(false);
        setIsModalOpen(false);
        setIsConfirming(false);
        setTermsAccepted(false);
        setManualAccepted(false);
        setIsManual(false);
        setCategoryIndex(-1);
        clearInputs();
      }, 1000);
    } catch (error) {
      // Handle error
      setIsConfirming(false);
      console.error('Upload failed:', error);
    }
  };

  const handleManual = async () => {
    const { data, error } = await client.rpc('get_component_by_category', {
      category_name: category,
    });

    if (error) {
      // console.log(error);
      return;
    }

    const options: ComboboxOption[] = data.map(
      (item: Record<string, unknown>, index: number) => ({
        value: index.toString(),
        label: item.name as string,
      })
    );

    setComboOptions(options);
    setCategoryData(data);
    setIsErrorModalOpen(false);
    setIsModalOpen(true);
    setIsManual(true);
  };

  const handleCancelModal = () => {
    setIsModalOpen(false);
    setTermsAccepted(false);
    setManualAccepted(false);
    setIsManual(false);
    setCategoryIndex(-1);
  };

  const handleCancel = () => {
    clearInputs();
  };

  if (isSubmitting) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <SpinnerEmpty
          onCancel={() => {
            setIsSubmitting(false);
            setIsModalOpen(false);
          }}
        />
      </div>
    );
  }

  return (
    <>
      <form
        onSubmit={handlePreSubmit}
        className="flex h-full w-full flex-col space-y-4 rounded-xl pt-3 pr-2 pb-5 pl-5"
      >
        <CardHeader className="mb-3 px-1 py-0">
          <CardTitle>Report an issue</CardTitle>
          <CardDescription className="text-xs">
            Pick which category to submit a report in
          </CardDescription>
        </CardHeader>

        {/* Category Combobox */}
        <div className="flex w-full flex-col">
          <label className="mb-1 block text-sm font-medium text-gray-700"></label>
          <ComboboxForm onSelect={handleCategory} value={category} />
        </div>

        {/* Image Uploader */}
        <div className="w-full">
          <ImageUploader onImageChange={setImage} image={image} />
        </div>

        {/* Description Input */}
        <Field>
          <FieldContent className="max-h-44">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
              rows={4}
            />
          </FieldContent>
        </Field>

        {/* Buttons pinned at the bottom */}
        <div className="mt-auto flex min-w-0 gap-3">
          <Button
            type="button"
            onClick={handleCancel}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!category.trim() || !description.trim() || !image}
            className="flex-1"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </form>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="flex flex-col gap-1">
            <DialogTitle>Confirm Report Submission</DialogTitle>
            <DialogDescription>
              Please review your report details before submitting
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Category Display */}
            <div>
              <label className="mb-2 block text-sm">Category</label>
              <div className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm">
                {categoryLabel}
              </div>
            </div>

            {/*  Category ID  Display */}
            <div className="w-full">
              <label className="mb-2 block text-sm">Category ID</label>
              <ComboboxForm
                value={categoryIndex >= 0 ? categoryIndex.toString() : ''}
                options={comboOption}
                onSelect={(value) => setCategoryIndex(parseInt(value))}
                placeholder="Please select the correct ID"
                searchPlaceholder="Search..."
                emptyText="No options found"
                showSearch={true}
              />
              {/* <select
                value={categoryIndex}
                onChange={(e) => setCategoryIndex(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              >
                <option value="-1">Please select the correct ID</option>

                {categoryData.map((pipe, index) => (
                  <option key={index} value={index}>
                    {pipe.name} - {pipe.distance?.toFixed(0)}m away
                    {index === 0 && " (Best Match)"}
                  </option>
                ))}
              </select> */}
            </div>

            {/* Description Display */}
            <div>
              <label className="mb-2 block text-sm">Description</label>
              <div className="min-h-[100px] w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm">
                {description || (
                  <span className="text-gray-400">No description entered</span>
                )}
              </div>
            </div>

            {/* Image Display */}

            <div className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm">
              {image ? (
                <span className="text-green-600">Image attached</span>
              ) : (
                <span className="text-gray-400">No image uploaded</span>
              )}
            </div>

            {/* Manual Acceptance Checkbox */}
            {isManual && (
              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="manual-terms"
                  checked={manualAccepted}
                  onCheckedChange={(checked) =>
                    setManualAccepted(checked as boolean)
                  }
                  className="mt-1 cursor-pointer"
                />
                <label
                  htmlFor="manual-terms"
                  className="text-sm leading-relaxed"
                >
                  I acknowledge that I am submitting this report without GPS
                  verification and confirm that the information provided is
                  accurate
                </label>
              </div>
            )}
            {/* Terms Acceptance Checkbox */}
            <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) =>
                  setTermsAccepted(checked as boolean)
                }
                className="mt-1 cursor-pointer"
              />
              <label htmlFor="terms" className="text-sm leading-relaxed">
                I accept the terms and conditions and confirm that the
                information provided is accurate
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelModal}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSubmit}
              disabled={isDisabled || isConfirming}
              className="w-full border border-[#2b3ea7] bg-[#4b72f3] text-white hover:bg-blue-600 sm:w-auto"
            >
              {isConfirming ? 'Confirming...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isErrorModalOpen} onOpenChange={setIsErrorModalOpen}>
        <DialogContent className="flex flex-col gap-2">
          <DialogHeader>
            <div className="mb-2 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <DialogTitle className="text-lg">{errorCode}</DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground">
              Please ensure your photo was taken at the issue site and includes
              location sufficient data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#4b72f3]"></span>
                  <span>Enable location services on your device</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#4b72f3]"></span>
                  <span>Capture the photo directly from your camera app</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#4b72f3]"></span>
                  <span>Ensure your device embeds location data in images</span>
                </li>
              </ul>
            </div>
          </div>

          <Button onClick={handleManual} className="!h-11">
            Enter Manually Instead
          </Button>
        </DialogContent>
      </Dialog>
      {alertNow && (
        <div className="fixed top-4 right-4 z-[9999] flex items-start gap-2 rounded-lg bg-green-600 px-4 py-3 text-white shadow-lg">
          <CheckCircle2Icon />
          <AlertTitle>Success! Your report has been submitted.</AlertTitle>
        </div>
      )}
    </>
  );
}
