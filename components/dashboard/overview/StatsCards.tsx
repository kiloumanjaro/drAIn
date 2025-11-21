import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { formatDays } from "@/lib/dashboard/calculations";

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-[#ced1cd] p-6"
          >
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: "Fixed This Month",
      value: fixedThisMonth,
      icon: <CheckCircle2 className="w-6 h-6 text-green-600" />,
      color: "text-green-600",
    },
    {
      label: "Pending Issues",
      value: pendingIssues,
      icon: <AlertCircle className="w-6 h-6 text-orange-600" />,
      color: "text-orange-600",
    },
    {
      label: "Average Repair Time",
      value: formatDays(averageRepairDays),
      icon: <Clock className="w-6 h-6 text-blue-600" />,
      color: "text-blue-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white rounded-lg border border-[#ced1cd] p-6 hover:border-blue-400 transition-shadow"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                {stat.label}
              </p>
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
            {stat.icon}
          </div>
          <div className="text-xs text-gray-500">
            {stat.label === "Fixed This Month"
              ? "Reports resolved"
              : stat.label === "Pending Issues"
              ? "Awaiting action"
              : "From report to completion"}
          </div>
        </div>
      ))}
    </div>
  );
}
