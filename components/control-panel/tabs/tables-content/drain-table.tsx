'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

    sorted.sort((a, b) => {
      const aValue: string | number = a[sortField];
      const bValue: string | number = b[sortField];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    return sorted;
  }, [filteredData, sortField, sortDirection]);

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
    <div className="flex flex-1 flex-col gap-6 pt-3 pr-3 pb-5 pl-5">
      <CardHeader className="px-1 py-0">
        <CardTitle>Storm Drain Inventory</CardTitle>
        <CardDescription className="text-xs">
          Showing {sortedData.length} of {data.length} drains
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">
                  <Button
                    variant="ghost"
                    onClick={() => onSort('id')}
                    className="hover:bg-accent"
                  >
                    Drain ID
                    {renderSortIcon('id')}
                  </Button>
                </TableHead>
                <TableHead className="text-center">
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
                sortedData.map((drain) => (
                  <TableRow
                    key={drain.In_Name}
                    onClick={() => onSelectDrain(drain)}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <TableCell className="text-center font-mono text-sm">
                      {drain.In_Name}
                    </TableCell>
                    <TableCell className="text-center">
                      {drain.InvElev}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </div>
  );
}
