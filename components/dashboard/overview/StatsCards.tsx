import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { formatDays } from '@/lib/dashboard/calculations';

interface StatsCardsProps {
  fixedThisMonth: number;
  pendingIssues: number;
  averageRepairDays: number;
  loading?: boolean;
}

export default function StatsCards({
  fixedThisMonth,
  pendingIssues,
  averageRepairDays,
  loading = false,
}: StatsCardsProps) {
  if (loading) {
    return (
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-[#ced1cd] bg-white p-6"
          >
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="mb-2 h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: 'Fixed This Month',
      value: fixedThisMonth,
      icon: <CheckCircle2 className="h-6 w-6 text-green-600" />,
      color: 'text-green-600',
    },
    {
      label: 'Pending Issues',
      value: pendingIssues,
      icon: <AlertCircle className="h-6 w-6 text-orange-600" />,
      color: 'text-orange-600',
    },
    {
      label: 'Average Repair Time',
      value: formatDays(averageRepairDays),
      icon: <Clock className="h-6 w-6 text-blue-600" />,
      color: 'text-blue-600',
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="rounded-lg border border-[#ced1cd] bg-white p-6 transition-shadow hover:border-blue-400"
        >
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="mb-1 text-sm font-medium text-gray-600">
                {stat.label}
              </p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
            {stat.icon}
          </div>
          <div className="text-xs text-gray-500">
            {stat.label === 'Fixed This Month'
              ? 'Reports resolved'
              : stat.label === 'Pending Issues'
                ? 'Awaiting action'
                : 'From report to completion'}
          </div>
        </div>
      ))}
    </div>
  );
}
