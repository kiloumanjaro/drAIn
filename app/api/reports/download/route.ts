import { NextRequest, NextResponse } from 'next/server';
import { createRequestClient } from '@/lib/supabase/server';
import type { Tables } from '@/types/database.types';
import { csvField, monthRangeUtc, parseMonthYear } from '@/lib/reports/csv';
import type { UserRole } from '@/lib/supabase/enums';

// Roles allowed to export reports. An allowlist, so a role added to the enum
// later gets no access until it is listed here.
const EXPORT_ROLES: readonly UserRole[] = ['staff', 'admin'];

// Only the columns the CSV writes. The private ones (user_id, photo_lat,
// photo_lon, reviewed_by) aren't selectable from the table, so '*' fails.
const CSV_COLUMNS =
  'id, created_at, category, description, reporter_name, status, priority, address, zone, lat, long' as const;
type ReportRecord = Pick<
  Tables<'reports'>,
  | 'id'
  | 'created_at'
  | 'category'
  | 'description'
  | 'reporter_name'
  | 'status'
  | 'priority'
  | 'address'
  | 'zone'
  | 'lat'
  | 'long'
>;

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

    if (!profile || !EXPORT_ROLES.includes(profile.role)) {
      return NextResponse.json(
        { error: 'Only agency staff can download reports' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const period = parseMonthYear(
      searchParams.get('month'),
      searchParams.get('year')
    );
    if (!period) {
      return NextResponse.json(
        { error: 'Give a month (1-12) and a four-digit year' },
        { status: 400 }
      );
    }
    const { month, year } = period;
    // Built from the parsed numbers only, never from the raw query.
    const filename = `reports_${getMonthName(month)}_${year}.csv`;

    // The month's bounds in Manila time, independent of the server's zone.
    const { start, end } = monthRangeUtc(month, year);

    // The month's reports, except rejected ones (spam and duplicates), which
    // every other surface leaves out too.
    const { data: reports, error } = await supabase
      .from('reports')
      .select(CSV_COLUMNS)
      .gte('created_at', start.toISOString())
      .lt('created_at', end.toISOString())
      .neq('review_status', 'rejected')
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
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Generate CSV content
    const csv = generateCSV(reports);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
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
          // The reader's calendar, not the server's: a UTC host would
          // otherwise date early-morning reports to the previous day.
          timeZone: 'Asia/Manila',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '';

    return [
      csvField(report.id),
      csvField(date),
      csvField(report.category),
      csvField(report.description),
      csvField(report.reporter_name),
      csvField(report.status),
      csvField(report.priority),
      csvField(report.address),
      csvField(report.zone),
      csvField(report.lat),
      csvField(report.long),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
