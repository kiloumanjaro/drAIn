"use client";

import { useEffect, useState } from 'react';
import FloodReportDisplay from './FloodReportDisplay';
import { useSearchParams } from 'next/navigation';

export default function FloodReportsPage() {
  const [reportData, setReportData] = useState({ reportTitle: '', reportSubtitle: '', introduction: '', events: [] });
  const [comparisonEvent, setComparisonEvent] = useState(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    async function getReportData() {
      const res = await fetch('/api/reports');
      const data = await res.json();
      setReportData(data);
    }

    getReportData();

    const compareEventParam = searchParams.get('compareEvent');
    if (compareEventParam) {
      try {
        setComparisonEvent(JSON.parse(decodeURIComponent(compareEventParam)));
      } catch (e) {
        console.error("Failed to parse comparison event data:", e);
      }
    }
  }, [searchParams]);

  return (
      <FloodReportDisplay historicalData={reportData} comparisonData={comparisonEvent} />
  );
}
