"use client";

import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Map, FileText } from "lucide-react";

// Import tab components (will create these)
import OverviewTab from "@/components/dashboard/overview/OverviewTab";
import AnalyticsTab from "@/components/dashboard/analytics/AnalyticsTab";
import ReportsTab from "@/components/dashboard/reports/ReportsTab";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");

  // Manage scrollbar visibility
  React.useEffect(() => {
    document.body.style.overflowY = "scroll";
    return () => {
      document.body.style.overflowY = "";
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#e8e8e8]/50">
      <div className="w-[1280px] mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl border border-[#ced1cd] py-8 px-6 mb-6">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            drAIn Public Dashboard
          </h1>
          <p className="text-base text-foreground/70 leading-relaxed">
            Real-time transparency and analytics for the drainage system. All data is
            publicly available to build community trust.
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-[#ced1cd] overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-t-xl bg-blue-50 border-b border-blue-200">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <Map className="w-4 h-4" />
                <span>Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>All Reports</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab Content */}
            <div className="p-6">
              <TabsContent value="overview" className="m-0">
                <OverviewTab />
              </TabsContent>
              <TabsContent value="analytics" className="m-0">
                <AnalyticsTab />
              </TabsContent>
              <TabsContent value="reports" className="m-0">
                <ReportsTab />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
