import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET() {
  const filePath = path.join(
    process.cwd(),
    'data',
    'mandaue_flood_reports.json'
  );
  try {
    const fileContents = await fs.readFile(filePath, 'utf8');
    return new NextResponse(fileContents, {
      headers: {
        'Content-Type': 'application/json',
        // The file only changes on deploy: five minutes fresh, then served
        // stale for up to a day while a new copy is fetched.
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Failed to read flood reports:', error);
    return NextResponse.json(
      { error: 'Failed to load flood reports' },
      { status: 500 }
    );
  }
}
