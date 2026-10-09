import { forwardRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface DataFieldCardProps {
  label: string;
  value: string | number;
  description?: string;
  unit?: string;
}

export const DataFieldCard = forwardRef<HTMLDivElement, DataFieldCardProps>(
  ({ label, value, description, unit }, ref) => {
    return (
      <Card ref={ref} className="overflow-hidden border-none p-0 py-3">
        <CardContent>
          <div className="space-y-1">
            <div className="flex flex-row items-center justify-between gap-3">
              {/* Row 1: Data Type/Label */}
              <div className="text-muted-foreground shrink-0 text-xs font-semibold tracking-wider">
                {label}
              </div>
              {/* Row 2: Value */}
              <div className="flex min-w-0 flex-row items-baseline justify-end gap-1">
                <div className="text-foreground min-w-0 text-right text-xl font-bold break-words">
                  {value}
                </div>
                {unit && (
                  <span className="text-muted-foreground text-sm">{unit}</span>
                )}
              </div>
            </div>

            {/* Row 3: Description */}
            {description && (
              <div className="text-muted-foreground text-[11px] leading-relaxed">
                {description}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);

DataFieldCard.displayName = 'DataFieldCard';
