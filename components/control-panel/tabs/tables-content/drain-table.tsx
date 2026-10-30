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
import type { Drain } from '@/components/control-panel/types';

interface DrainTableProps {
  data: Drain[];
  searchTerm: string;
  onSort: (field: DrainSortField) => void;
  sortField: DrainSortField;
  sortDirection: SortDirection;
  onSelectDrain: (drain: Drain) => void;
}

export type DrainSortField = 'id' | 'In_Name' | 'InvElev' | 'clog_per';
type SortDirection = 'asc' | 'desc';

/** Rows drawn at a time. */
const ROWS_PER_PAGE = 50;

export function DrainTable({
  data,
  searchTerm,
  onSort,
  sortField,
  sortDirection,
  onSelectDrain,
}: DrainTableProps) {
  // --- Filtering ---
  const filteredData = useMemo(() => {
    return data.filter((drain) => {
      return (
        drain.In_Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        drain.id.toString().includes(searchTerm.toLowerCase())
      );
    });
  }, [data, searchTerm]);

  // --- Sorting ---
  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    // The "Drain ID" column shows the drain's name, so it sorts by the name.
    const sortKey = sortField === 'id' ? 'In_Name' : sortField;

    sorted.sort((a, b) => {
      const aValue: string | number = a[sortKey];
      const bValue: string | number = b[sortKey];

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
  const renderSortIcon = (field: DrainSortField) => {
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
        <CardTitle>Storm Drain Inventory</CardTitle>
        <CardDescription className="text-xs">
          Showing {sortedData.length} of {data.length} drains
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
                    Drain ID
                    {renderSortIcon('id')}
                  </Button>
                </TableHead>
                <TableHead className="sticky top-0 z-10 bg-white text-center shadow-[inset_0_-1px_0_var(--border)]">
                  <Button
                    variant="ghost"
                    onClick={() => onSort('InvElev')}
                    className="hover:bg-accent"
                  >
                    Inv. Elev (m)
                    {renderSortIcon('InvElev')}
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    No drains found.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((drain) => (
                  <TableRow
                    key={drain.In_Name}
                    onClick={() => onSelectDrain(drain)}
                    // Selectable from the keyboard too, like the mouse.
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectDrain(drain);
                      }
                    }}
                    className="hover:bg-muted/50 focus-visible:bg-muted/50 cursor-pointer transition-colors outline-none"
                  >
                    <TableCell className="text-center font-mono text-sm">
                      {drain.In_Name}
                    </TableCell>
                    <TableCell className="text-center">
                      {/* GeoJSON attributes: typed as numbers, not checked. */}
                      {typeof drain.InvElev === 'number'
                        ? drain.InvElev.toFixed(2)
                        : drain.InvElev}
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
