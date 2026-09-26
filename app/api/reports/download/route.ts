import { NextRequest, NextResponse } from 'next/server';
import { createRequestClient } from '@/lib/supabase/server';

interface ReportRecord {
  id: string;
  created_at: string;
  category: string | null;
  description: string | null;
  image: string | null;
  reporter_name: string | null;
  status: string | null;
  component_id: string | null;
  lat: string | null;
  long: string | null;
  geocoded_status: string | null;
  address: string | null;
  priority: string | null;
  zone: string | null;
}

export async function GET(request: NextRequest) {
  try {
    // The export lists every report with reporter details, so it is for
    // agency staff only. The caller's own token is used for the query too.
    const authorization = request.headers.get('authorization');
    const supabase = createRequestClient(authorization);
    const token = authorization?.replace(/^Bearer\s+/i, '');
    const {
      data: { user },
    } = token ? await supabase.auth.getUser(token) : { data: { user: null } };

    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role === 'citizen') {
      return NextResponse.json(
        { error: 'Only agency staff can download reports' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!month || !year) {
      return NextResponse.json(
        { error: 'Month and year are required' },
        { status: 400 }
      );
    }

    // Calculate date range for the selected month
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(
      parseInt(year),
      parseInt(month),
      0,
      23,
      59,
      59,
      999
    );

    // Fetch reports for the specified month
    const { data: reports, error } = await supabase
      .from('reports')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500 }
      );
    }

    if (!reports || reports.length === 0) {
      // Return empty CSV with headers
      const headers = [
        'ID',
        'Date',
        'Category',
        'Description',
        'Reporter Name',
        'Status',
        'Priority',
        'Address',
        'Zone',
        'Latitude',
        'Longitude',
      ];
      const csv = headers.join(',') + '\n';

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="reports_${getMonthName(parseInt(month))}_${year}.csv"`,
        },
      });
    }

    // Generate CSV content
    const csv = generateCSV(reports as ReportRecord[]);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="reports_${getMonthName(parseInt(month))}_${year}.csv"`,
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getMonthName(month: number): string {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return months[month - 1] || 'Unknown';
}

function escapeCSVField(field: string | null | undefined): string {
  if (field === null || field === undefined) return '';
  const stringField = String(field);
  // If the field contains comma, newline, or double quote, wrap it in quotes
  if (
    stringField.includes(',') ||
    stringField.includes('\n') ||
    stringField.includes('"')
  ) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
}

function generateCSV(reports: ReportRecord[]): string {
  const headers = [
    'ID',
    'Date',
    'Category',
    'Description',
    'Reporter Name',
    'Status',
    'Priority',
    'Address',
    'Zone',
    'Latitude',
    'Longitude',
  ];

  const rows = reports.map((report) => {
    const date = report.created_at
      ? new Date(report.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '';

    return [
      escapeCSVField(report.id),
      escapeCSVField(date),
      escapeCSVField(report.category),
      escapeCSVField(report.description),
      escapeCSVField(report.reporter_name),
      escapeCSVField(report.status),
      escapeCSVField(report.priority),
      escapeCSVField(report.address),
      escapeCSVField(report.zone),
      escapeCSVField(report.lat),
      escapeCSVField(report.long),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
