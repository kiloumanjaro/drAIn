import type { NodeParams, LinkParams } from './tabs/simulation-models/model3';
import type { Report } from '@/lib/supabase/report';

export interface Pipe {
  id: string;
  TYPE: string;
  Pipe_Shape: string;
  Pipe_Lngth: number;
  Height: number;
  Width: number;
  Barrels: number;
  ClogPer: number;
  ClogTime: number;
  Mannings: number;
  coordinates: [number, number][];
}

export interface Inlet {
  id: string;
  Inv_Elev: number;
  MaxDepth: number;
  Length: number;
  Height: number;
  Weir_Coeff: number;
  In_Type: number;
  ClogFac: number;
  ClogTime: number;
  FPLAIN_080: number;
  coordinates: [number, number];
}

export interface Outlet {
  id: string;
  Inv_Elev: number;
  AllowQ: number;
  FlapGate: number;
  coordinates: [number, number];
}

export interface Drain {
  id: string; // Changed from number to string to match In_Name
  In_Name: string;
  InvElev: number;
  clog_per: number;
  clogtime: number;
  Weir_coeff: number;
  Length: number;
  Height: number;
  Max_Depth: number;
  ClogFac: number;
  NameNum: number;
  FPLAIN_080: number;
  coordinates: [number, number]; // [lng, lat]
}

export type DetailItem = Pipe | Inlet | Outlet | Drain;

export type DatasetType = 'inlets' | 'man_pipes' | 'outlets' | 'storm_drains';

export type SortField = string;

export interface FieldConfig {
  label: string;
  key: string;
  description?: string;
  unit?: string;
}
interface RainfallParams {
  total_precip: number;
  duration_hr: number;
}

export interface ControlPanelProps {
  // Control panel state
  activeTab: string;
  dataset: DatasetType;
  // Selected items
  selectedInlet: Inlet | null;
  selectedOutlet: Outlet | null;
  selectedDrain: Drain | null;
  selectedPipe: Pipe | null;
  // Callbacks
  onTabChange: (tab: string) => void;
  onDatasetChange: (dataset: DatasetType) => void;
  onSelectInlet: (inlet: Inlet) => void;
  onSelectOutlet: (outlet: Outlet) => void;
  onSelectDrain: (drain: Drain) => void;
  onSelectPipe: (pipe: Pipe) => void;
  onBack: () => void;
  // Overlay props
  overlaysVisible: boolean;
  onToggle: (visible: boolean) => void;
  overlays: {
    id: string;
    name: string;
    color: string;
    visible: boolean;
  }[];
  onToggleOverlay: (id: string) => void;
  selectedFloodScenario: string;
  onChangeFloodScenario: (id: string) => void;
  // Flood prone areas
  floodProneAreas?: {
    id: string;
    name: string;
    color: string;
    visible: boolean;
  }[];
  onToggleFloodProneArea?: (id: string) => void;
  // Simulation mode
  isSimulationMode?: boolean;
  selectedPointForSimulation?: string | null;
  // Reports refresh
  onRefreshReports?: () => Promise<void>;
  isRefreshingReports?: boolean;
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
  showNodePanel?: boolean;
  rainfallParams?: RainfallParams;
  onRainfallParamsChange?: (params: RainfallParams) => void;
  onToggleNodePanel?: () => void;
  showLinkPanel?: boolean;
  onToggleLinkPanel?: () => void;
  // Shared handler for opening node simulation slideshow
  onOpenNodeSimulation?: (nodeId: string) => void;
  // Admin tab state
  activeAdminTab?: 'maintenance' | 'reports';
  onAdminTabChange?: (tab: 'maintenance' | 'reports') => void;
  allReportsData: Report[]; // Added for comprehensive report history
  onClosePopUps?: () => void;
  // Rain effect control
  isRainActive?: boolean;
  onToggleRain?: (enabled: boolean) => void;
  // Heatmap control
  isHeatmapActive?: boolean;
  onToggleHeatmap?: (enabled: boolean) => void;
  isFloodScenarioLoading?: boolean;
  isHeatmapLoading?: boolean;
}
