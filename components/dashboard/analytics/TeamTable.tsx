import { Skeleton } from "@/components/ui/skeleton";
import { formatDays } from "@/lib/dashboard/calculations";
import type { TeamPerformanceData } from "@/lib/dashboard/queries";

interface TeamTableProps {
  data: TeamPerformanceData[];
  loading?: boolean;
}

export default function TeamTable({ data, loading = false }: TeamTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-[#ced1cd] p-6">
        <h3 className="text-lg font-semibold mb-4">Team Performance</h3>
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
      <div className="bg-white rounded-lg border border-[#ced1cd] p-6">
        <h3 className="text-lg font-semibold mb-4">Team Performance</h3>
        <div className="text-center py-8 text-gray-500">
          <p>No team performance data available</p>
        </div>
      </div>
    );
  }

  const resolvedPercentage = (resolved: number, total: number) => {
    return total > 0 ? ((resolved / total) * 100).toFixed(0) : 0;
  };

  return (
    <div className="bg-white rounded-lg border border-[#ced1cd] p-6 overflow-x-auto">
      <h3 className="text-lg font-semibold mb-4">Team Performance</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#ced1cd]">
            <th className="text-left py-3 px-4 font-semibold text-gray-700">
              Agency
            </th>
            <th className="text-center py-3 px-4 font-semibold text-gray-700">
              Total Issues
            </th>
            <th className="text-center py-3 px-4 font-semibold text-gray-700">
              Resolved
            </th>
            <th className="text-center py-3 px-4 font-semibold text-gray-700">
              Avg Days
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((team, index) => (
            <tr
              key={team.agencyName}
              className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
            >
              <td className="py-3 px-4 text-gray-900 font-medium">
                {team.agencyName}
              </td>
              <td className="text-center py-3 px-4 text-gray-700">
                {team.totalIssues}
              </td>
              <td className="text-center py-3 px-4">
                <div className="flex items-center justify-center">
                  <span className="text-green-600 font-semibold">
                    {team.resolvedIssues}
                  </span>
                  <span className="text-gray-500 text-xs ml-1">
                    ({resolvedPercentage(team.resolvedIssues, team.totalIssues)}%)
                  </span>
                </div>
              </td>
              <td className="text-center py-3 px-4 text-blue-600 font-semibold">
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
