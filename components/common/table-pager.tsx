'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { pageLabel, type PageRange } from '@/lib/table/paginate';

interface TablePagerProps {
  range: PageRange;
  /** Rows in the whole table, after its search. */
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * The row of a paged table that says which rows are showing and steps to
 * the next ones. Draws nothing for a table that fits on one page.
 */
export function TablePager({
  range,
  total,
  onPageChange,
  className,
}: TablePagerProps) {
  if (range.pageCount <= 1) return null;

  return (
    <div
      role="group"
      aria-label="Table pages"
      className={cn(
        'flex items-center justify-between gap-2 text-xs',
        className
      )}
    >
      {/* Read out when the page changes, so the buttons' effect is heard. */}
      <span aria-live="polite" className="text-muted-foreground tabular-nums">
        {pageLabel(range, total)}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="no-drag h-7 px-2"
          disabled={range.page <= 1}
          onClick={() => onPageChange(range.page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="no-drag h-7 px-2"
          disabled={range.page >= range.pageCount}
          onClick={() => onPageChange(range.page + 1)}
          aria-label="Next page"
        >
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
