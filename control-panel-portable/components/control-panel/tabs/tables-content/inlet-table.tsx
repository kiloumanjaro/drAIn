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
import type { Inlet } from '@/components/control-panel/types';

interface InletTableProps {
  data: Inlet[];
  searchTerm: string;
  onSort: (field: InletSortField) => void;
  sortField: InletSortField;
  sortDirection: SortDirection;
  onSelectInlet: (inlet: Inlet) => void;
}

export type InletSortField =
  | 'id'
  | 'Inv_Elev'
  | 'MaxDepth'
  | 'Length'
  | 'ClogFac';
type SortDirection = 'asc' | 'desc';

export function InletTable({
  data,
  searchTerm,
  onSort,
  sortField,
  sortDirection,
  onSelectInlet,
}: InletTableProps) {
  // --- Filtering ---
  const filteredData = useMemo(() => {
    return data.filter((inlet) => {
      return inlet.id.toLowerCase().includes(searchTerm.toLowerCase());
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
  const renderSortIcon = (field: InletSortField) => {
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
        <CardTitle>Inlet Inventory</CardTitle>
        <CardDescription className="text-xs">
          Showing {sortedData.length} of {data.length} inlets
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
                    Inlet ID
                    {renderSortIcon('id')}
                  </Button>
                </TableHead>
                <TableHead className="text-center">
                  <Button
                    variant="ghost"
                    onClick={() => onSort('Inv_Elev')}
                    className="hover:bg-accent"
                  >
                    Elevation (m)
                    {renderSortIcon('Inv_Elev')}
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    No inlets found.
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((inlet) => (
                  <TableRow
                    key={inlet.id}
                    onClick={() => onSelectInlet(inlet)}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <TableCell className="text-center font-mono text-sm">
                      {inlet.id}
                    </TableCell>
                    <TableCell className="text-center">
                      {inlet.Inv_Elev.toFixed(2)}
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
