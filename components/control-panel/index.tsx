"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/components/context/AuthProvider";
import type { ControlPanelProps } from "./types";
import { DETAIL_TITLES } from "./constants";
import { useControlPanelState } from "./hooks/use-control-panel-state";
import { Sidebar } from "./components/sidebar";
import { TopBar } from "./components/top-bar";
import { ContentRenderer } from "./components/content-renderer";
import { usePipes, useInlets, useOutlets, useDrain } from "@/hooks";
import client from "@/app/api/client";
import type { DateFilterValue } from "../date-sort";
import type { Report } from "@/lib/supabase/report";

interface RainfallParams {
  total_precip: number;
  duration_hr: number;
}

const DEFAULT_RAINFALL_PARAMS: RainfallParams = {
  total_precip: 140,
  duration_hr: 1,
};

export function ControlPanel({
  reports,
  allReportsData,
  activeTab,
  dataset,
  selectedInlet,
  selectedOutlet,
  selectedDrain,
  selectedPipe,
  onTabChange,
  onDatasetChange,
  onSelectInlet,
  onSelectOutlet,
  onSelectDrain,
  onSelectPipe,
  onBack,
  overlaysVisible,
  onToggle,
  selectedFloodScenario,
  onChangeFloodScenario,
  overlays,
  onToggleOverlay,
  isSimulationMode = false,
  selectedPointForSimulation = null,
  onRefreshReports,
  isRefreshingReports = false,
  selectedYear,
  onYearChange,
  onGenerateTable,
  isLoadingTable,
  onCloseTable,
  hasTable = false,
  isTableMinimized = false,
  onToggleTableMinimize = () => {},
  onGenerateTable3,
  isLoadingTable3 = false,
  onCloseTable3,
  hasTable3 = false,
  isTable3Minimized = false,
  onToggleTable3Minimize = () => {},
  selectedComponentIds = [],
  onComponentIdsChange = () => {},
  selectedPipeIds = [],
  onPipeIdsChange = () => {},
  componentParams = new Map(),
  onComponentParamsChange = () => {},
  pipeParams = new Map(),
  onPipeParamsChange = () => {},
  rainfallParams = DEFAULT_RAINFALL_PARAMS,
  onRainfallParamsChange = () => {},
  showNodePanel = false,
  onToggleNodePanel = () => {},
  showLinkPanel = false,
  onToggleLinkPanel = () => {},
  onOpenNodeSimulation,
  onClosePopUps = () => {},
  isRainActive = false,
  onToggleRain,
  isFloodScenarioLoading = false,
}: ControlPanelProps & { reports: Report[] }) {
  // reports are latest, allReportsData are all
  const router = useRouter();
  const supabase = client;
  const authContext = useContext(AuthContext);
  const session = authContext?.session;

  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [publicAvatarUrl, setPublicAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      const userId = session.user.id;
      const cacheKey = `profile-${userId}`;
      const COMMON_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];

      const fetchProfile = async () => {
        console.log(
          "PROFILE LOAD: Initiating forced database fetch and URL regeneration."
        );
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Error fetching profile:", error);
        } else if (data) {
          const avatarPath = data.avatar_url as string | null;
          let publicUrl = null;

          if (avatarPath) {
            const pathParts = avatarPath.split(".");
            const currentExtension =
              pathParts.length > 1 ? `.${pathParts.pop()}` : "";
            const basePath = pathParts.join(".");

            const extensionsToTry = [
              currentExtension,
              ...COMMON_EXTENSIONS.filter((ext) => ext !== currentExtension),
            ].filter((ext) => ext !== "");

            for (const ext of extensionsToTry) {
              const testPath = basePath + ext;
              const { data: urlData } = supabase.storage
                .from("Avatars")
                .getPublicUrl(testPath);

              const candidateUrl = urlData.publicUrl;

              try {
                const response = await fetch(candidateUrl, { method: "HEAD" });

                if (response.ok) {
                  publicUrl = candidateUrl;
                  break;
                }
              } catch (_e) {
                console.warn(`Fetch failed for ${ext}. Skipping.`);
              }
            }

            if (!publicUrl) {
              console.log(
                "AVATAR URL: No valid public URL found after trying common extensions."
              );
            }
          } else {
            console.log(
              "AVATAR URL: The 'avatar_url' column is empty/null in the database."
            );
          }

          setProfile(data);
          setPublicAvatarUrl(publicUrl);

          localStorage.setItem(
            cacheKey,
            JSON.stringify({ profile: data, publicAvatarUrl: publicUrl })
          );
        } else {
          console.log(
            "PROFILE LOAD: No profile found for user ID. Data is null/undefined."
          );
        }
      };

      fetchProfile();
    } else if (session === null) {
      setProfile(null);
      setPublicAvatarUrl(null);
    }
  }, [session, supabase]);

  const {
    sortField,
    sortDirection,
    searchTerm,
    profileView,
    setProfileView,
    activeReportTab,
    setActiveReportTab,
    setActiveAdminTab,
    activeAdminTab,
    handleSort,
    handleSearch,
  } = useControlPanelState();

  // Drag control state
  const [isDragEnabled, setIsDragEnabled] = useState(false);

  const handleToggleDrag = (enabled: boolean) => {
    setIsDragEnabled(enabled);
  };

  // Date filter state
  const [dateFilter, setDateFilter] = useState<DateFilterValue>("all");

  const handleSignOut = async () => {
    const session = await supabase.auth.getSession();
    if (session?.data?.session) {
      const cacheKey = `profile-${session.data.session.user.id}`;
      localStorage.removeItem(cacheKey);
    }
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Data hooks
  const { inlets, loading: loadingInlets } = useInlets();
  const { outlets, loading: loadingOutlets } = useOutlets();
  const { pipes, loading: loadingPipes } = usePipes();
  const { drains, loading: loadingDrains } = useDrain();

  const selectedItem =
    selectedInlet || selectedPipe || selectedOutlet || selectedDrain;
  const selectedItemTitle = selectedItem ? DETAIL_TITLES[dataset] : "";

  const handleNavigateToTable = (
    dataset: "inlets" | "outlets" | "storm_drains" | "man_pipes"
  ) => {
    onDatasetChange(dataset);
    onTabChange("stats");
  };

  const handleNavigateToReportForm = () => {
    onTabChange("report");
  };

  const handleNavigateToDataSource = () => {
    window.open("https://psa.gov.ph/statistics/population-and-housing/node/166426", "_blank");
  };

  return (
    <div className={`absolute m-5 flex flex-row h-[600px] w-sm rounded-2xl overflow-hidden ${
      activeTab === "chatbot"
        ? "bg-gradient-to-b from-blue-50 via-white to-blue-50"
        : "bg-white"
    }`}>
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        profile={profile}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <TopBar
          activeTab={activeTab}
          dataset={dataset}
          onDatasetChange={onDatasetChange}
          onSearch={handleSearch}
          onBack={onBack}
          hasSelectedItem={!!selectedItem}
          selectedItemTitle={selectedItemTitle}
          overlaysVisible={overlaysVisible}
          onToggleOverlays={onToggle}
          isDragEnabled={isDragEnabled}
          onToggleDrag={handleToggleDrag}
          onSignOut={handleSignOut}
          activeReportTab={activeReportTab}
          onReportTabChange={setActiveReportTab}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          activeAdminTab={activeAdminTab}
          onAdminTabChange={setActiveAdminTab}
          onClosePopUps={onClosePopUps}
        />

        {/* Main Content */}
        <div
          className={`control-panel-scroll relative flex-1 overflow-auto ${
            activeTab === "stats" ? "overflow-y-scroll" : ""
          }`}
        >
          <ContentRenderer
            activeTab={activeTab}
            dataset={dataset}
            searchTerm={searchTerm}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            inlets={inlets}
            pipes={pipes}
            outlets={outlets}
            drains={drains}
            loadingInlets={loadingInlets}
            loadingPipes={loadingPipes}
            loadingOutlets={loadingOutlets}
            loadingDrains={loadingDrains}
            selectedInlet={selectedInlet}
            selectedPipe={selectedPipe}
            selectedOutlet={selectedOutlet}
            selectedDrain={selectedDrain}
            onSelectInlet={onSelectInlet}
            onSelectPipe={onSelectPipe}
            onSelectOutlet={onSelectOutlet}
            onSelectDrain={onSelectDrain}
            overlays={overlays}
            onToggleOverlay={onToggleOverlay}
            selectedFloodScenario={selectedFloodScenario}
            onChangeFloodScenario={onChangeFloodScenario}
            onNavigateToTable={handleNavigateToTable}
            onNavigateToReportForm={handleNavigateToReportForm}
            onNavigateToDataSource={handleNavigateToDataSource}
            isDragEnabled={isDragEnabled}
            onToggleDrag={handleToggleDrag}
            isSimulationMode={isSimulationMode}
            selectedPointForSimulation={selectedPointForSimulation}
            reports={reports} // Still passing 'reports' for the map
            allReportsData={allReportsData} // Pass all reports data down
            profileView={profileView}
            onProfileViewChange={setProfileView}
            activeReportTab={activeReportTab}
            activeAdminTab={activeAdminTab}
            dateFilter={dateFilter}
            onRefreshReports={onRefreshReports}
            isRefreshingReports={isRefreshingReports}
            profile={profile}
            publicAvatarUrl={publicAvatarUrl}
            setProfile={setProfile}
            selectedYear={selectedYear}
            onYearChange={onYearChange}
            onGenerateTable={onGenerateTable}
            isLoadingTable={isLoadingTable}
            onCloseTable={onCloseTable}
            hasTable={hasTable}
            isTableMinimized={isTableMinimized}
            onToggleTableMinimize={onToggleTableMinimize}
            onGenerateTable3={onGenerateTable3}
            isLoadingTable3={isLoadingTable3}
            onCloseTable3={onCloseTable3}
            hasTable3={hasTable3}
            isTable3Minimized={isTable3Minimized}
            onToggleTable3Minimize={onToggleTable3Minimize}
            setPublicAvatarUrl={setPublicAvatarUrl}
            selectedComponentIds={selectedComponentIds}
            onComponentIdsChange={onComponentIdsChange}
            selectedPipeIds={selectedPipeIds}
            onPipeIdsChange={onPipeIdsChange}
            componentParams={componentParams}
            onComponentParamsChange={onComponentParamsChange}
            pipeParams={pipeParams}
            onPipeParamsChange={onPipeParamsChange}
            rainfallParams={rainfallParams}
            onRainfallParamsChange={onRainfallParamsChange}
            showNodePanel={showNodePanel}
            onToggleNodePanel={onToggleNodePanel}
            showLinkPanel={showLinkPanel}
            onToggleLinkPanel={onToggleLinkPanel}
            onOpenNodeSimulation={onOpenNodeSimulation}
            isRainActive={isRainActive}
            onToggleRain={onToggleRain}
            isFloodScenarioLoading={isFloodScenarioLoading}
          />
        </div>
      </div>
    </div>
  );
}
