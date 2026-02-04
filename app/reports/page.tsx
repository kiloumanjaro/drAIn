import { Suspense } from 'react';
import FloodReportClient from './FloodReportClient';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading report…</div>}>
      <FloodReportClient />
    </Suspense>
  );
}
