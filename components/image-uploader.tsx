'use client';
import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';
import { AddIcon } from './add-icon';

interface ImageUploaderProps {
  onImageChange?: (file: File | null) => void;
  image?: File | null;
  placeholder?: string;
  disabled?: boolean;
}

export default function ImageUploader({
  onImageChange,
  image,
  placeholder = 'Drag Your Files Here',
  disabled = false,
}: ImageUploaderProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  useEffect(() => {
    if (image) {
      const newUrl = URL.createObjectURL(image);
      setFileName(image.name);
      setFileUrl(newUrl);

      return () => {
        URL.revokeObjectURL(newUrl);
      };
    } else {
      setFileName(null);
      setFileUrl(null);
    }
  }, [image]);

  const handleFile = (file: File | undefined) => {
    if (!file || disabled) return;

    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds 10 MB limit.');
      return;
    }

    setError(null);
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
    }

    setFileName(file.name);
    setFileUrl(URL.createObjectURL(file));
    setIsDragging(false);
    onImageChange?.(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
  };

  const handleReset = () => {
    if (disabled) return;
    setFileName(null);
    setError(null);
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
    }
    setFileUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onImageChange?.(null);
  };

  return (
    <div className="flex w-full max-w-xs flex-col items-center rounded-lg font-sans">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        className={`flex h-40 w-full flex-col items-center justify-center rounded-lg border-2 transition-all duration-300 ease-in-out ${
          disabled
            ? 'cursor-not-allowed border-gray-200 bg-gray-100 opacity-60'
            : isDragging
              ? 'border-blue-500 bg-blue-50'
              : fileName
                ? 'border-gray-200'
                : 'cursor-pointer border-dashed border-gray-300 bg-[#f1f3ff] hover:border-blue-400'
        } `}
      >
        {!fileName ? (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <label
              className={`flex h-12 w-12 items-center justify-center rounded-full border border-[#2b3ea7] bg-[#4b72f3] text-white transition-colors ${
                disabled
                  ? 'cursor-not-allowed opacity-50'
                  : 'cursor-pointer hover:bg-blue-600'
              }`}
            >
              <AddIcon className="h-5 w-5" />
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="hidden"
                ref={fileInputRef}
                disabled={disabled}
              />
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">{placeholder}</span>
              <span className="text-muted-foreground text-xs">
                Upload files with maximum 10 MB
              </span>
            </div>
            {error && (
              <span className="mt-2 text-xs text-red-500">{error}</span>
            )}
          </div>
        ) : (
          <div className="relative flex h-full w-full items-center justify-center">
            {fileUrl && (
              <Image
                src={fileUrl}
                alt="Uploaded preview"
                fill
                className="h-full w-full rounded-md object-cover"
              />
            )}
            <div className="absolute inset-0 flex items-end justify-between p-2">
              <span className="bg-opacity-70 text-muted-foreground max-w-[80%] truncate rounded-md bg-white px-3 py-1.5 text-[11px]">
                {fileName}
              </span>
              <button
                onClick={handleReset}
                disabled={disabled}
                className={`rounded-full border border-[#cd152b] bg-[#f34445] p-1.5 text-white shadow-lg transition-colors duration-200 ${
                  disabled
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:bg-[#dc2b35]'
                }`}
              >
                <X className="h-3.5 w-3.5 cursor-pointer text-white" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
