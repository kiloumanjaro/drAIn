import type { DatasetType, Pipe, Inlet, Outlet, Drain } from "../types";
import type { Report } from "@/lib/supabase/report";
import { FIELD_CONFIGS, MODEL_URLS } from "../constants";
import { DetailView } from "./detail-view";
import OverlaysContent from "../tabs/overlays-content";
import { ReportsTab } from "../tabs/reports-content";
import { ChatbotView } from "../tabs/chatbot-content";
import type { DateFilterValue } from "../../date-sort";
import {
  PipeTable,
  InletTable,
  OutletTable,
  DrainTable,
  PipeSortField,
  InletSortField,
  OutletSortField,
  DrainSortField,
} from "@/components/control-panel/tabs/tables-content";
import SimulationsContent from "@/components/control-panel/tabs/simulations-content";
import {
  type NodeParams,
  type LinkParams,
} from "@/components/control-panel/tabs/simulation-models/model3";
import ProfileContent from "@/components/control-panel/tabs/profile-content";
import HistoryContent from "@/components/control-panel/tabs/history-content";
import type { ProfileView } from "../hooks/use-control-panel-state";

interface RainfallParams {
  total_precip: number;
  duration_hr: number;
}

const DEFAULT_RAINFALL_PARAMS: RainfallParams = {
  total_precip: 140,
  duration_hr: 1,
};

interface ContentRendererProps {
  activeTab: string;
  dataset: DatasetType;
  searchTerm: string;
  sortField: string;
  sortDirection: "asc" | "desc";
  onSort: (field: string) => void;

  // Data and loading states
  inlets: Inlet[];
  pipes: Pipe[];
  outlets: Outlet[];
  drains: Drain[];
  loadingInlets: boolean;
  loadingPipes: boolean;
  loadingOutlets: boolean;
  loadingDrains: boolean;

  // Selected items
  selectedInlet: Inlet | null;
  selectedPipe: Pipe | null;
  selectedOutlet: Outlet | null;
  selectedDrain: Drain | null;

  // Selection handlers
  onSelectInlet: (inlet: Inlet) => void;
  onSelectPipe: (pipe: Pipe) => void;
  onSelectOutlet: (outlet: Outlet) => void;
  onSelectDrain: (drain: Drain) => void;

  // Overlay props
  overlays: Array<{
    id: string;
    name: string;
    color: string;
    visible: boolean;
  }>;
  onToggleOverlay: (id: string) => void;
  selectedFloodScenario?: string;
  onChangeFloodScenario?: (id: string) => void;
  
  // Flood prone areas
  floodProneAreas?: {
    id: string;
    name: string;
    color: string;
    visible: boolean;
  }[];
  onToggleFloodProneArea?: (id: string) => void;

  // Navigation props
  onNavigateToTable?: (
    dataset: "inlets" | "outlets" | "storm_drains" | "man_pipes"
  ) => void;
  onNavigateToReportForm?: () => void;
  onNavigateToDataSource?: () => void;

  // Drag control props
  isDragEnabled?: boolean;
  onToggleDrag?: (enabled: boolean) => void;

  // Simulation mode
  isSimulationMode?: boolean;
  selectedPointForSimulation?: string | null;

  // Reports
  reports: Report[];
  activeReportTab?: "submission" | "reports";
  activeAdminTab?: "maintenance" | "reports";
  dateFilter?: DateFilterValue;
  onRefreshReports?: () => Promise<void>;
  isRefreshingReports?: boolean;

  // Profile view
  profileView?: ProfileView;
  onProfileViewChange?: (view: ProfileView) => void;

  // Profile data
  profile: Record<string, unknown> | null;
  publicAvatarUrl: string | null;
  setProfile: (profile: Record<string, unknown>) => void;
  setPublicAvatarUrl: (url: string | null) => void;

  // Vulnerability table props (Model 2)
  selectedYear?: number | null;
  onYearChange?: (year: number | null) => void;
  onGenerateTable?: () => void;
  isLoadingTable?: boolean;
  onCloseTable?: () => void;
  hasTable?: boolean;
  isTableMinimized?: boolean;
  onToggleTableMinimize?: () => void;

  // Model 3 table props
  onGenerateTable3?: () => void;
  isLoadingTable3?: boolean;
  onCloseTable3?: () => void;
  hasTable3?: boolean;
  isTable3Minimized?: boolean;
  onToggleTable3Minimize?: () => void;

  // Model3 panel props
  selectedComponentIds?: string[];
  onComponentIdsChange?: (ids: string[]) => void;
  selectedPipeIds?: string[];
  onPipeIdsChange?: (ids: string[]) => void;
  componentParams?: Map<string, NodeParams>;
  onComponentParamsChange?: (params: Map<string, NodeParams>) => void;
  pipeParams?: Map<string, LinkParams>;
  onPipeParamsChange?: (params: Map<string, LinkParams>) => void;
  rainfallParams: RainfallParams;
  onRainfallParamsChange: (params: RainfallParams) => void;
  showNodePanel?: boolean;
  onToggleNodePanel?: () => void;
  showLinkPanel?: boolean;
  onToggleLinkPanel?: () => void;

  // Shared handler for opening node simulation slideshow
  onOpenNodeSimulation?: (nodeId: string) => void;
  allReportsData: Report[]; // Added for comprehensive report history
  // Rain effect control
  isRainActive?: boolean;
  onToggleRain?: (enabled: boolean) => void;
}

export function ContentRenderer({
  activeTab,
  dataset,
  searchTerm,
  sortField,
  sortDirection,
  onSort,
  inlets,
  pipes,
  outlets,
  drains,
  loadingInlets,
  loadingPipes,
  loadingOutlets,
  loadingDrains,
  selectedInlet,
  selectedPipe,
  selectedOutlet,
  selectedDrain,
  onSelectInlet,
  onSelectPipe,
  onSelectOutlet,
  onSelectDrain,
  overlays,
  onToggleOverlay,
  selectedFloodScenario,
  onChangeFloodScenario,
  floodProneAreas,
  onToggleFloodProneArea,
  onNavigateToTable,
  onNavigateToReportForm,
  onNavigateToDataSource,
  isDragEnabled,
  onToggleDrag,
  isSimulationMode = false,
  selectedPointForSimulation = null,
  activeReportTab = "submission",
  activeAdminTab = "reports",
  dateFilter = "all",
  onRefreshReports,
  isRefreshingReports = false,
  profileView = "main",
  onProfileViewChange = () => {},
  profile,
  publicAvatarUrl,
  setProfile,
  setPublicAvatarUrl,
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
  allReportsData, // Destructure allReportsData
  isRainActive = false,
  onToggleRain,
}: ContentRendererProps) {
  // Check for loading states first
  if (loadingInlets)
    return <div className="p-4 text-center">Loading inlets...</div>;
  if (loadingPipes)
    return <div className="p-4 text-center">Loading pipes...</div>;
  if (loadingOutlets)
    return <div className="p-4 text-center">Loading outlets...</div>;
  if (loadingDrains)
    return <div className="p-4 text-center">Loading drains...</div>;

  switch (activeTab) {
    case "overlays":
      return (
        <OverlaysContent
          overlays={overlays}
          onToggleOverlay={onToggleOverlay}
          onNavigateToTable={onNavigateToTable}
          onNavigateToReportForm={onNavigateToReportForm}
          onNavigateToDataSource={onNavigateToDataSource}
          searchTerm={searchTerm}
          isDragEnabled={isDragEnabled}
          onToggleDrag={onToggleDrag}
          reports={allReportsData}
          isSimulationMode={isSimulationMode}
          selectedFloodScenario={selectedFloodScenario}
          onChangeFloodScenario={onChangeFloodScenario}
          floodProneAreas={floodProneAreas}
          onToggleFloodProneArea={onToggleFloodProneArea}
        />
      );

    case "stats":
      return renderStatsContent();

    case "simulations":
      return (
        <SimulationsContent
          isSimulationMode={isSimulationMode}
          selectedPointId={selectedPointForSimulation}
          selectedInlet={selectedInlet}
          selectedOutlet={selectedOutlet}
          selectedPipe={selectedPipe}
          selectedDrain={selectedDrain}
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
        />
      );

    case "report":
      return (
        <ReportsTab
          activeReportTab={activeReportTab}
          dateFilter={dateFilter}
          reports={allReportsData}
          onRefreshReports={onRefreshReports}
          isRefreshingReports={isRefreshingReports}
          isSimulationMode={isSimulationMode}
          selectedInlet={selectedInlet}
          selectedOutlet={selectedOutlet}
          selectedPipe={selectedPipe}
          selectedDrain={selectedDrain}
        />
      );

    case "chatbot":
      return <ChatbotView />;

    case "profile":
      return (
        <ProfileContent
          profileView={profileView}
          onProfileViewChange={onProfileViewChange}
          profile={profile}
          publicAvatarUrl={publicAvatarUrl}
          setProfile={setProfile}
          setPublicAvatarUrl={setPublicAvatarUrl}
        />
      );

    case "admin":
      return (
        <HistoryContent
          activeAdminTab={activeAdminTab}
          dateFilter={dateFilter}
          selectedInlet={selectedInlet}
          selectedOutlet={selectedOutlet}
          selectedPipe={selectedPipe}
          selectedDrain={selectedDrain}
          reports={allReportsData}
          onRefreshReports={onRefreshReports}
          isRefreshingReports={isRefreshingReports}
          isSimulationMode={isSimulationMode}
          profile={profile}
        />
      );

    default:
      return null;
  }

  function renderStatsContent() {
    const selectedItem =
      selectedInlet || selectedPipe || selectedOutlet || selectedDrain;

    if (selectedItem) {
      return (
        <DetailView
          item={selectedItem}
          fields={FIELD_CONFIGS[dataset]}
          modelUrl={MODEL_URLS[dataset]}
        />
      );
    }

    // Render appropriate table based on dataset
    switch (dataset) {
      case "inlets":
        return (
          <InletTable
            data={inlets}
            searchTerm={searchTerm}
            onSort={onSort}
            sortField={sortField as InletSortField}
            sortDirection={sortDirection}
            onSelectInlet={(inlet) => {
              onSelectInlet(inlet);
            }}
          />
        );

      case "man_pipes":
        return (
          <PipeTable
            data={pipes}
            searchTerm={searchTerm}
            onSort={onSort}
            sortField={sortField as PipeSortField}
            sortDirection={sortDirection}
            onSelectPipe={(pipe) => {
              onSelectPipe(pipe);
            }}
          />
        );

      case "outlets":
        return (
          <OutletTable
            data={outlets}
            searchTerm={searchTerm}
            onSort={onSort}
            sortField={sortField as OutletSortField}
            sortDirection={sortDirection}
            onSelectOutlet={(outlet) => {
              onSelectOutlet(outlet);
            }}
          />
        );

      case "storm_drains":
        return (
          <DrainTable
            data={drains}
            searchTerm={searchTerm}
            onSort={onSort}
            sortField={sortField as DrainSortField}
            sortDirection={sortDirection}
            onSelectDrain={(drain) => {
              onSelectDrain(drain);
            }}
          />
        );

      default:
        return null;
    }
  }
}
