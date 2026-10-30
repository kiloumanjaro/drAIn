'use client';

import { useState } from 'react';
import { paginate } from '@/lib/table/paginate';

/**
 * One page of a table's rows, for drawing. Sorting, searching and selecting
 * go on working on the whole list; this only decides which rows are shown.
 *
 * `resetKey` names the current sort and search. When it changes the table
 * goes back to its first page, since the rows on the old page are not the
 * same rows any more.
 */
export function usePagedRows<Row>(
  rows: Row[],
  pageSize: number,
  resetKey: string
) {
  // The page is kept with the key it was chosen under, so a new key means
  // page 1 in the same render, with no effect to reset it.
  const [wanted, setWanted] = useState({ key: resetKey, page: 1 });
  const range = paginate(
    rows.length,
    pageSize,
    wanted.key === resetKey ? wanted.page : 1
  );

  const setPage = (page: number) => setWanted({ key: resetKey, page });

  return {
    pageRows: rows.slice(range.start, range.end),
    range,
    setPage,
  };
}
