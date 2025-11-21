"use client";

import { useEffect, useState } from "react";
import ZoneMap from "./ZoneMap";
import ComponentTypeChart from "./ComponentTypeChart";
import RepairTimeCards from "./RepairTimeCards";
import TeamTable from "./TeamTable";
import {
  getIssuesPerZone,
  getComponentTypeData,
  getRepairTimeByComponent,
  getTeamPerformance,
} from "@/lib/dashboard/queries";
import type {
  ZoneIssueData,
  ComponentTypeData,
  RepairTimeByComponentData,
  TeamPerformanceData,
} from "@/lib/dashboard/queries";

export default function AnalyticsTab() {
  const [zoneData, setZoneData] = useState<ZoneIssueData[]>([]);
  const [componentData, setComponentData] = useState<ComponentTypeData[]>([]);
  const [repairTimeData, setRepairTimeData] = useState<RepairTimeByComponentData[]>([]);
  const [teamData, setTeamData] = useState<TeamPerformanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [zones, components, times, teams] = await Promise.all([
          getIssuesPerZone(),
          getComponentTypeData(),
          getRepairTimeByComponent(),
          getTeamPerformance(),
        ]);
        setZoneData(zones);
        setComponentData(components);
        setRepairTimeData(times);
        setTeamData(teams);
      } catch (err) {
        console.error("Error fetching analytics data:", err);
        setError("Failed to load analytics data. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Zone Map */}
      <ZoneMap data={zoneData} loading={loading} />

      {/* Repair Time Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Average Repair Time by Component</h3>
        <RepairTimeCards data={repairTimeData} loading={loading} />
      </div>

      {/* Component Type Chart */}
      <ComponentTypeChart data={componentData} loading={loading} />

      {/* Team Performance */}
      <TeamTable data={teamData} loading={loading} />

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Zone Analysis</h4>
          <p className="text-sm text-blue-800">
            Issues are tracked by barangay to identify problem areas and prioritize
            maintenance efforts where they are most needed.
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2">Team Performance</h4>
          <p className="text-sm text-green-800">
            Team metrics show which agencies are resolving issues most efficiently,
            helping to identify best practices and training opportunities.
          </p>
        </div>
      </div>
    </div>
  );
}
