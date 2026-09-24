'use client';

import * as React from 'react';
import { IconInfoCircle, IconStar } from '@tabler/icons-react';

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
}

export function LinkBar({ link = '' }: LinkBarProps) {
  const [isFavorite, setIsFavorite] = React.useState(false);

  return (
    <div className="grid w-full max-w-sm gap-6">
      <InputGroup className="min-w-0 bg-white px-1 [--radius:9999px]">
        {/* ensure children can shrink/truncate */}
        <Popover>
          <PopoverTrigger asChild>
            <InputGroupAddon>
              <InputGroupButton variant="ghost" size="icon-xs">
                <IconInfoCircle className="text-[#666666]" />
              </InputGroupButton>
            </InputGroupAddon>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="flex flex-col gap-1 rounded-xl px-5 py-4 text-sm"
          >
            <p className="mb-1 font-medium">Jupyter Notebook</p>
            <p className="text-muted-foreground text-xs">
              Refer to the official documentation for details on the machine
              learning model development process
            </p>
          </PopoverContent>
        </Popover>
        <InputGroupAddon className="pl-1.5 font-normal text-[#666666]">
          https://
        </InputGroupAddon>
        <span className="min-w-0 flex-1 truncate py-2 text-sm text-[#666666]">
          {link || 'your-link-here.com'}
        </span>
        <InputGroupAddon align="inline-end" className="flex-shrink-0">
          <InputGroupButton
            onClick={() => setIsFavorite(!isFavorite)}
            size="icon-xs"
            className="flex-shrink-0"
          >
            <IconStar
              data-favorite={isFavorite}
              className="data-[favorite=true]:fill-blue-600 data-[favorite=true]:stroke-blue-600"
            />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}
