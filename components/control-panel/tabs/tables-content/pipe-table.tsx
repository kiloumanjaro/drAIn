'use client';

import { useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TablePager } from '@/components/common/table-pager';
import { usePagedRows } from '@/hooks/use-paged-rows';
import { ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import type { Pipe } from '@/components/control-panel/types';

interface PipeTableProps {
  data: Pipe[];
  searchTerm: string;
  onSort: (field: PipeSortField) => void;
  sortField: PipeSortField;
  sortDirection: SortDirection;
  onSelectPipe: (pipe: Pipe) => void;
}

export type PipeSortField =
  | 'id'
  | 'TYPE'
  | 'Pipe_Shape'
  | 'Pipe_Lngth'
  | 'ClogPer';
type SortDirection = 'asc' | 'desc';

/** Rows drawn at a time. */
const ROWS_PER_PAGE = 50;

export function PipeTable({
  data,
  searchTerm,
  onSort,
  sortField,
  sortDirection,
  onSelectPipe,
}: PipeTableProps) {
  // --- Filtering ---
  const filteredData = useMemo(() => {
    return data.filter((pipe) => {
      return (
        pipe.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pipe.TYPE.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [data, searchTerm]);

  // --- Sorting ---
  const sortedData = useMemo(() => {
    const sorted = [...filteredData];

    sorted.sort((a, b) => {
      const aValue: string | number = a[sortField];
      const bValue: string | number = b[sortField];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue, undefined, { numeric: true })
          : bValue.localeCompare(aValue, undefined, { numeric: true });
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    return sorted;
  }, [filteredData, sortField, sortDirection]);

  // --- Paging ---
  // Only one page of rows is drawn; the sort and the search above still
  // cover every row, and changing either starts again from the first page.
  const topRef = useRef<HTMLDivElement>(null);
  const { pageRows, range, setPage } = usePagedRows(
    sortedData,
    ROWS_PER_PAGE,
    `${searchTerm}|${sortField}|${sortDirection}`
  );

  const handlePageChange = (page: number) => {
    setPage(page);
    // The next page is read from its top. The panel's content area is what
    // scrolls, not the table.
    topRef.current?.closest('.control-panel-scroll')?.scrollTo({ top: 0 });
  };

  // --- Helpers ---
  const renderSortIcon = (field: PipeSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  return (
    <div
      ref={topRef}
      className="flex flex-1 flex-col gap-6 pt-3 pr-3 pb-5 pl-5"
    >
      <CardHeader className="px-1 py-0">
        <CardTitle>Pipe Inventory</CardTitle>
        <CardDescription className="text-xs">
          Showing {sortedData.length} of {data.length} pipes
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="rounded-md border">
          {/* A plain table, not Table: that one wraps itself in a box that
              scrolls sideways, and the headings would stick to the box
              instead of to the panel, which is what scrolls. */}
          <table className="w-full caption-bottom text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 z-10 bg-white text-center shadow-[inset_0_-1px_0_var(--border)]">
                  <Button
                    variant="ghost"
                    onClick={() => onSort('id')}
                    className="hover:bg-accent"
                  >
                    Pipe ID
                    {renderSortIcon('id')}
                  </Button>
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-white text-center shadow-[inset_0_-1px_0_var(--border)]">
                  <Button
                    variant="ghost"
                    onClick={() => onSort('Pipe_Lngth')}
                    className="hover:bg-accent"
                  >
                    Length (m)
                    {renderSortIcon('Pipe_Lngth')}
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    No pipes found.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((pipe) => (
                  <TableRow
                    key={pipe.id}
                    onClick={() => onSelectPipe(pipe)}
                    // Selectable from the keyboard too, like the mouse.
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectPipe(pipe);
                      }
                    }}
                    className="hover:bg-muted/50 focus-visible:bg-muted/50 cursor-pointer transition-colors outline-none"
                  >
                    <TableCell className="text-center font-mono text-sm">
                      {pipe.id}
                    </TableCell>
                    <TableCell className="text-center">
                      {/* GeoJSON attributes: typed as numbers, not checked. */}
                      {typeof pipe.Pipe_Lngth === 'number'
                        ? pipe.Pipe_Lngth.toFixed(2)
                        : pipe.Pipe_Lngth}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </table>
        </div>
        <TablePager
          range={range}
          total={sortedData.length}
          onPageChange={handlePageChange}
          className="sticky bottom-0 z-10 bg-white px-1 py-2"
        />
      </CardContent>
    </div>
  );
}
