import { Skeleton } from '@/components/ui/skeleton';
import { formatDays } from '@/lib/dashboard/calculations';
import type { TeamPerformanceData } from '@/lib/dashboard/queries';

interface TeamTableProps {
  data: TeamPerformanceData[];
  loading?: boolean;
}

export default function TeamTable({ data, loading = false }: TeamTableProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-[#ced1cd] bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">Team Performance</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-[#ced1cd] bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">Team Performance</h3>
        <div className="py-8 text-center text-gray-500">
          <p>No team performance data available</p>
        </div>
      </div>
    );
  }

  const resolvedPercentage = (resolved: number, total: number) => {
    return total > 0 ? ((resolved / total) * 100).toFixed(0) : 0;
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-[#ced1cd] bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold">Team Performance</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#ced1cd]">
            <th className="px-4 py-3 text-left font-semibold text-gray-700">
              Agency
            </th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">
              Total Issues
            </th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">
              Resolved
            </th>
            <th className="px-4 py-3 text-center font-semibold text-gray-700">
              Avg Days
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((team, index) => (
            <tr
              key={team.agencyName}
              className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
            >
              <td className="px-4 py-3 font-medium text-gray-900">
                {team.agencyName}
              </td>
              <td className="px-4 py-3 text-center text-gray-700">
                {team.totalIssues}
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center">
                  <span className="font-semibold text-green-600">
                    {team.resolvedIssues}
                  </span>
                  <span className="ml-1 text-xs text-gray-500">
                    ({resolvedPercentage(team.resolvedIssues, team.totalIssues)}
                    %)
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-center font-semibold text-blue-600">
                {formatDays(team.averageDays)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 text-sm text-gray-600">
        <p>Agency performance based on issue resolution and repair time.</p>
      </div>
    </div>
  );
}
