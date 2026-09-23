'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Report } from '@/lib/supabase/report';
import { format } from 'date-fns';

interface UserReportsListProps {
  userId?: string;
  reports?: Report[];
  isGuest?: boolean;
}

export default function UserReportsList({
  userId,
  reports = [],
  isGuest = false,
}: UserReportsListProps) {
  // Filter reports by userId if available, otherwise show all
  const userReports = userId
    ? reports.filter((report) => report.reporterName === userId)
    : reports;

  const getCategoryVariant = (category: string) => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('clog') || lowerCategory.includes('block')) {
      return 'default';
    }
    if (
      lowerCategory.includes('damage') ||
      lowerCategory.includes('collapse') ||
      lowerCategory.includes('corrosion')
    ) {
      return 'destructive';
    }
    if (lowerCategory.includes('overflow')) {
      return 'secondary';
    }
    return 'outline';
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'unresolved':
        return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
    }
  };

  return (
    <Card className="flex h-full max-h-[350px] flex-col gap-0 overflow-hidden rounded-none border-none py-0">
      <CardContent className="relative flex-1 overflow-y-auto p-4 pl-6">
        {userReports.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-muted-foreground px-15 pt-8 pb-12 text-center text-sm">
              {isGuest
                ? 'Reports are not recorded when not signed in'
                : "You haven't submitted any reports yet."}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {userReports.map((item) => (
              <div
                key={item.id}
                className="hover:bg-accent flex flex-col gap-3 rounded-lg border px-5 py-3 transition-colors"
              >
                {/* Report Details */}
                <div className="flex flex-1 flex-col gap-3">
                  <div className="flex-1">
                    {/* Description */}
                    <p className="text-foreground mb-2 line-clamp-2 text-xs">
                      {item.description}
                    </p>

                    {/* Metadata */}
                    <div className="text-muted-foreground flex flex-col gap-1 text-[10px]">
                      <div className="flex items-center gap-2">
                        <span>
                          {format(new Date(item.date), 'MMM dd, yyyy')}
                        </span>
                        <span>
                          ({item.coordinates[1].toFixed(4)},{' '}
                          {item.coordinates[0].toFixed(4)})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-row gap-2">
                    <Badge
                      variant={getCategoryVariant(item.category)}
                      className="h-5 justify-center px-3 py-0 text-[10px] font-normal"
                    >
                      {item.category}
                    </Badge>
                    <div
                      className={`flex h-5 items-center justify-center rounded-md border px-3 py-0.5 text-[10px] ${getStatusStyle(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
