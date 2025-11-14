import fs from 'fs/promises';
import path from 'path';
import FloodReportDisplay from './FloodReportDisplay';
import { NewEventData } from '@/stores/eventWidgetStore';

async function getReportData() {
  const filePath = path.join(process.cwd(), 'data', 'mandaue_flood_reports.json');
  const jsonData = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(jsonData);
}

export default async function FloodReportsPage({ searchParams }: { searchParams?: { [key: string]: string | undefined } }) {
  const reportData = await getReportData();
  let comparisonEvent: NewEventData | null = null;
  if (searchParams?.compareEvent) {
    try {
      comparisonEvent = JSON.parse(decodeURIComponent(searchParams.compareEvent));
    } catch (e) {
      console.error("Failed to parse comparison event data:", e);
    }
  }

  return <FloodReportDisplay historicalData={reportData} comparisonData={comparisonEvent} />;
}
