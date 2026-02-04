'use client';

import { contributors } from '@/lib/contributors-list';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

import { useState } from 'react';

export function ContributorsButton() {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleClose = () => {
    setIsExpanded(false);
  };

  return (
    <div className="relative flex w-[270px] items-end">
      <button
        onClick={handleClick}
        className={`flex flex-1 cursor-pointer flex-row items-center gap-2 rounded-full border border-gray-300 p-1 pr-3 transition-all duration-200 ${
          isExpanded ? 'bg-white' : 'bg-white'
        }`}
      >
        <div className="relative h-14 w-full">
          {contributors.map((member, index) => (
            <div
              key={member.id}
              className="absolute"
              style={{
                left: `${index * 40}px`,
                zIndex: contributors.length - index,
              }}
            >
              <div className="relative h-14 w-14">
                <Image
                  src={member.image || '/placeholder.svg'}
                  alt={`${member.name} - ${member.role}`}
                  fill
                  className="rounded-full border-4 border-white object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-row items-center">
          {isExpanded ? (
            <ChevronUp color="#8e8d92" className="mr-1" />
          ) : (
            <ChevronDown color="#8e8d92" className="mr-1" />
          )}
        </div>
      </button>

      {/* Dropdown Panel */}
      {isExpanded && (
        <div className="absolute top-full left-0 z-50 mt-2 w-xs overflow-hidden rounded-2xl border border-gray-300 bg-white">
          {/* Header with close button */}
          <div className="relative flex items-center justify-end border-b border-gray-300 bg-gray-100 p-2">
            <h3 className="text-md absolute left-1/2 -translate-x-1/2 transform self-center font-medium text-gray-600">
              Contributors
            </h3>
            <button
              onClick={handleClose}
              className="p-1 text-gray-400 transition-colors hover:text-gray-600"
              aria-label="Close panel"
            >
              <X size={18} />
            </button>
          </div>

          {/* Contributors Grid */}
          <div className="px-4 py-4">
            <div className="mb-4 grid grid-cols-4 gap-4">
              {contributors.map((member) => (
                <Link
                  key={member.id}
                  href={member.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex cursor-pointer flex-col items-center gap-1 transition-transform duration-200 hover:scale-105"
                >
                  <div className="relative h-14 w-14">
                    <Image
                      src={member.image || '/placeholder.svg'}
                      alt={member.name}
                      fill
                      className="rounded-full object-cover transition-all duration-200"
                    />
                  </div>
                  <span className="w-full truncate text-center text-xs text-gray-600 transition-colors hover:text-blue-600">
                    {member.name}
                  </span>
                </Link>
              ))}
            </div>

            {/* Join Button */}
            <Button
              asChild
              className="mb-3 w-full rounded-xl border border-[#2b3ea7] bg-[#4b72f3] py-6 text-base font-medium text-white transition-colors hover:bg-gray-800"
            >
              <Link
                href="https://github.com/eliseoalcaraz/pjdsc"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Repository
              </Link>
            </Button>
            {/* Footer Text */}
            <p className="text-center text-xs text-gray-500">
              Source code available on GitHub
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
