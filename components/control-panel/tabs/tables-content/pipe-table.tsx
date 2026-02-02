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
    <div className="flex flex-1 flex-col gap-6 pt-3 pr-3 pb-5 pl-5">
      <CardHeader className="px-1 py-0">
        <CardTitle>Pipe Inventory</CardTitle>
        <CardDescription className="text-xs">
          Showing {sortedData.length} of {data.length} pipes
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
                    Pipe ID
                    {renderSortIcon('id')}
                  </Button>
                </TableHead>
                <TableHead className="text-center">
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
                sortedData.map((pipe) => (
                  <TableRow
                    key={pipe.id}
                    onClick={() => onSelectPipe(pipe)}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <TableCell className="text-center font-mono text-sm">
                      {pipe.id}
                    </TableCell>
                    <TableCell className="text-center">
                      {pipe.Pipe_Lngth}
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
