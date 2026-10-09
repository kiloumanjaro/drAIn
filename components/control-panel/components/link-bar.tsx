'use client';

import * as React from 'react';
import { IconInfoCircle } from '@tabler/icons-react';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
} from '@/components/ui/input-group';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface LinkBarProps {
  link?: string;
  /** Printed before the link; the page's own when it is not https. */
  scheme?: string;
}

export function LinkBar({ link = '', scheme = 'https://' }: LinkBarProps) {
  return (
    <div className="grid w-full max-w-sm gap-6">
      <InputGroup className="min-w-0 bg-white px-1 [--radius:9999px]">
        {/* ensure children can shrink/truncate */}
        <Popover>
          <InputGroupAddon>
            <PopoverTrigger asChild>
              <InputGroupButton
                variant="ghost"
                size="icon-xs"
                aria-label="About this link"
              >
                <IconInfoCircle aria-hidden="true" className="text-[#666666]" />
              </InputGroupButton>
            </PopoverTrigger>
          </InputGroupAddon>
          <PopoverContent
            align="start"
            className="flex flex-col gap-1 rounded-xl px-5 py-4 text-sm"
          >
            <p className="mb-1 font-medium">Link to this view</p>
            <p className="text-muted-foreground text-xs">
              The public address of what this panel shows. How the simulation
              and its ratings work is in the Documentation page.
            </p>
          </PopoverContent>
        </Popover>
        <InputGroupAddon className="pl-1.5 font-normal text-[#666666]">
          {scheme}
        </InputGroupAddon>
        <span className="min-w-0 flex-1 truncate py-2 text-sm text-[#666666]">
          {link || 'your-link-here.com'}
        </span>
      </InputGroup>
    </div>
  );
}
