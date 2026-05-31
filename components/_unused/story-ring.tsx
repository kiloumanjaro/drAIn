'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface StoryRingAvatarProps {
  src: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  isSignedIn?: boolean;
}

export function StoryRingAvatar({
  src,
  alt,
  size = 'md',
  className,
  isSignedIn = false,
}: StoryRingAvatarProps) {
  const router = useRouter();
  const [_isHovered, _setIsHovered] = useState(false);

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  };

  const innerSizeClasses = {
    sm: 'w-[34px] h-[34px]',
    md: 'w-[50px] h-[50px]',
    lg: 'w-[74px] h-[74px]',
  };

  return (
    <div className="relative inline-block">
      {/* Facebook-inspired blue gradient ring */}
      <div
        className={cn(
          'relative cursor-pointer rounded-full p-[3px]',
          'bg-gradient-to-tr from-[#0866ff] via-[#0a7cff] via-[#2d88ff] to-[#5ba3ff]',
          'animate-in zoom-in-50 duration-500 ease-out',
          'hover:scale-110 hover:rotate-[5deg]',
          'transition-all duration-300',
          sizeClasses[size],
          className
        )}
        onClick={() =>
          router.push(isSignedIn ? '/map?activetab=profile' : '/login')
        }
      >
        {/* Avatar container */}
        <div
          className={cn(
            'relative overflow-hidden rounded-full bg-[#f2f2f2]',
            innerSizeClasses[size]
          )}
        >
          <Image
            src={src || '/placeholder.svg'}
            alt={alt}
            fill
            className="object-cover"
          />
        </div>
      </div>
    </div>
  );
}
