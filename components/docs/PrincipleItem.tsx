'use client';

import { LucideIcon } from 'lucide-react';

interface PrincipleItemProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function PrincipleItem({
  icon: Icon,
  title,
  description,
}: PrincipleItemProps) {
  const titleWithoutColon = title.endsWith(':') ? title.slice(0, -1) : title;

  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-slate-100">
        <Icon className="h-5 w-5 text-slate-600" />
      </div>
      <div className="flex flex-1 flex-col">
        <p className="text-foreground text-base font-semibold">
          {titleWithoutColon}
        </p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}
