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
import type { Outlet } from '@/components/control-panel/types';

export type OutletSortField = 'id' | 'Inv_Elev' | 'AllowQ' | 'FlapGate';
export type SortDirection = 'asc' | 'desc';

export interface OutletTableProps {
  data: Outlet[];
  searchTerm: string;
  onSort: (field: OutletSortField) => void;
  sortField: OutletSortField;
  sortDirection: SortDirection;
  onSelectOutlet: (outlet: Outlet) => void;
}

export function OutletTable({
  data,
  searchTerm,
  onSort,
  sortField,
  sortDirection,
  onSelectOutlet,
}: OutletTableProps) {
  // --- Filtering ---
  const filteredData = useMemo(() => {
    return data.filter((outlet) => {
      return outlet.id.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [data, searchTerm]);

  // --- Sorting ---
  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

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

  const renderSortIcon = (field: OutletSortField) => {
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
        <CardTitle>Outlet Inventory</CardTitle>
        <CardDescription className="text-xs">
          Showing {sortedData.length} of {data.length} outlets
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
                    Outlet ID
                    {renderSortIcon('id')}
                  </Button>
                </TableHead>
                <TableHead className="text-center">
                  <Button
                    variant="ghost"
                    onClick={() => onSort('Inv_Elev')}
                    className="hover:bg-accent"
                  >
                    Inv. Elev (m)
                    {renderSortIcon('Inv_Elev')}
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    No outlets found.
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((outlet) => (
                  <TableRow
                    key={outlet.id}
                    onClick={() => onSelectOutlet(outlet)}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <TableCell className="text-center font-mono text-sm">
                      {outlet.id}
                    </TableCell>
                    <TableCell className="text-center">
                      {outlet.Inv_Elev}
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
