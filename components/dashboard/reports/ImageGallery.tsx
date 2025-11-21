"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ImageGalleryProps {
  images: string[];
  alt?: string;
}

// Placeholder image SVG (1x1 grey pixel)
const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='16' fill='%239ca3af'%3EImage not available%3C/text%3E%3C/svg%3E";

// Helper function to validate URL
function isValidUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Helper function to get image source with fallback
function getImageSrc(url: string): string {
  return isValidUrl(url) ? url : PLACEHOLDER_IMAGE;
}

export default function ImageGallery({ images, alt = "Report image" }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
        <p>No image available</p>
      </div>
    );
  }

  const handlePrevious = () => {
    setSelectedIndex((prev) =>
      prev === null ? 0 : (prev - 1 + images.length) % images.length
    );
  };

  const handleNext = () => {
    setSelectedIndex((prev) =>
      prev === null ? 0 : (prev + 1) % images.length
    );
  };

  return (
    <>
      {/* Thumbnail Grid */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        {images.slice(0, 3).map((image, index) => (
          <div
            key={index}
            className="relative w-full aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity bg-gray-100"
            onClick={() => setSelectedIndex(index)}
          >
            <Image
              src={getImageSrc(image)}
              alt={`${alt} ${index + 1}`}
              fill
              className="object-cover"
            />
            {images.length > 3 && index === 2 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold">
                +{images.length - 3}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Full Screen Dialog */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-4xl w-full max-h-screen p-0 border-0">
          <div className="relative bg-black w-full h-96 md:h-[600px] flex items-center justify-center">
            {/* Image */}
            <div className="relative w-full h-full">
              <Image
                src={getImageSrc(images[selectedIndex ?? 0])}
                alt={`${alt} ${(selectedIndex ?? 0) + 1}`}
                fill
                className="object-contain"
              />
            </div>

            {/* Close Button */}
            <button
              onClick={() => setSelectedIndex(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
              {(selectedIndex ?? 0) + 1} / {images.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
