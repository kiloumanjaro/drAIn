
import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  const filePath = path.join(process.cwd(), 'data', 'mandaue_flood_reports.json');
  const fileContents = await fs.readFile(filePath, 'utf8');
  return new NextResponse(fileContents, { headers: { 'Content-Type': 'application/json' } });
}
