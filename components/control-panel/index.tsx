'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/context/auth-provider';
import type { ControlPanelProps } from './types';
import { DETAIL_TITLES } from './constants';
import { useControlPanelState } from './hooks/use-control-panel-state';
import { Sidebar } from './components/sidebar';
import { TopBar } from './components/top-bar';
import { ContentRenderer } from './components/content-renderer';
import {
  usePipes,
  useInlets,
  useOutlets,
  useDrains,
} from '@/lib/query/hooks/use-drainage-data';
import { signOutAndForgetProfile } from '@/lib/supabase/sign-out';
import type { DateFilterValue } from '@/components/common/date-sort';
import {
  cycleSheet,
  sheetAfterDrag,
  sheetHandleLabel,
  type SheetState,
} from '@/lib/control-panel/sheet';

// Heights of the phone sheet. Written out in full so Tailwind finds them.
const SHEET_HEIGHT: Record<SheetState, string> = {
  collapsed: 'max-md:h-[5.25rem]',
  half: 'max-md:h-[55dvh]',
  // Leaves the top of the map, and the navigation button on it, in reach.
  full: 'max-md:h-[calc(100dvh-4.5rem)]',
};

interface RainfallParams {
  total_precip: number;
  duration_hr: number;
}

const DEFAULT_RAINFALL_PARAMS: RainfallParams = {
  total_precip: 140,
  duration_hr: 1,
};

export function ControlPanel({
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
  floodProneAreas,
  onToggleFloodProneArea,
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
  isFloodPropagationActive = false,
  onToggleFloodPropagation,
  isFloodScenarioLoading = false,
}: ControlPanelProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

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
  const [dateFilter, setDateFilter] = useState<DateFilterValue>('all');

  const handleSignOut = async () => {
    await signOutAndForgetProfile(queryClient);
    router.push('/login');
  };

  // Data hooks with TanStack Query
  const { data: inlets = [], isLoading: loadingInlets } = useInlets();
  const { data: outlets = [], isLoading: loadingOutlets } = useOutlets();
  const { data: pipes = [], isLoading: loadingPipes } = usePipes();
  const { data: drains = [], isLoading: loadingDrains } = useDrains();

  const selectedItem =
    selectedInlet || selectedPipe || selectedOutlet || selectedDrain;
  const selectedItemTitle = selectedItem ? DETAIL_TITLES[dataset] : '';

  // Phones only: the panel is a sheet at the bottom of the screen.
  const [sheet, setSheet] = useState<SheetState>('half');
  const dragStartY = useRef<number | null>(null);
  const dragged = useRef(false);

  // Something picked on the map shows its details here, so a collapsed
  // sheet opens for it. Compared during render rather than in an effect.
  const selectionKey = selectedItem ? `${dataset}:${selectedItem.id}` : '';
  const [seenSelectionKey, setSeenSelectionKey] = useState(selectionKey);
  if (selectionKey !== seenSelectionKey) {
    setSeenSelectionKey(selectionKey);
    if (selectionKey && sheet === 'collapsed') setSheet('half');
  }

  const handleTabChange = (tab: string) => {
    if (sheet === 'collapsed') setSheet('half');
    onTabChange(tab);
  };

  const handleNavigateToTable = (
    dataset: 'inlets' | 'outlets' | 'storm_drains' | 'man_pipes'
  ) => {
    onDatasetChange(dataset);
    onTabChange('stats');
  };

  const handleNavigateToReportForm = () => {
    onTabChange('report');
  };

  const handleNavigateToDataSource = () => {
    window.open(
      'https://psa.gov.ph/statistics/population-and-housing/node/166426',
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    // From tablet width up: a floating card, never taller than the screen.
    // On phones: a sheet across the bottom with a handle, the content, then
    // the tabs, so the map above it stays in reach.
    <div
      className={`flex overflow-hidden motion-reduce:transition-none max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:flex-col max-md:rounded-t-2xl max-md:shadow-[0_-4px_16px_rgba(0,0,0,0.15)] max-md:transition-[height] max-md:duration-200 md:absolute md:m-5 md:h-[min(600px,calc(100dvh-2.5rem))] md:w-sm md:flex-row md:rounded-2xl ${SHEET_HEIGHT[sheet]} ${
        activeTab === 'chatbot'
          ? 'bg-gradient-to-b from-blue-50 via-white to-blue-50'
          : 'bg-white'
      }`}
    >
      {/* Sheet handle (phones): tap to step through the heights, or drag */}
      <button
        type="button"
        aria-label={sheetHandleLabel(sheet)}
        aria-expanded={sheet !== 'collapsed'}
        onPointerDown={(e) => {
          dragStartY.current = e.clientY;
          dragged.current = false;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerUp={(e) => {
          if (dragStartY.current === null) return;
          const next = sheetAfterDrag(sheet, e.clientY - dragStartY.current);
          dragStartY.current = null;
          if (next !== null) {
            dragged.current = true;
            setSheet(next);
          }
        }}
        onPointerCancel={() => {
          dragStartY.current = null;
        }}
        onClick={() => {
          // A drag already moved the sheet; the click that follows it must not.
          if (dragged.current) {
            dragged.current = false;
            return;
          }
          setSheet(cycleSheet(sheet));
        }}
        className="flex h-7 w-full shrink-0 touch-none items-center justify-center md:hidden"
      >
        <span className="h-1.5 w-10 rounded-full bg-gray-300" />
      </button>

      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        profile={profile}
      />

      <div
        className={`flex min-h-0 flex-1 flex-col overflow-hidden ${
          sheet === 'collapsed' ? 'max-md:hidden' : ''
        }`}
      >
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
            activeTab === 'stats' ? 'overflow-y-scroll' : ''
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
            floodProneAreas={floodProneAreas}
            onToggleFloodProneArea={onToggleFloodProneArea}
            onNavigateToTable={handleNavigateToTable}
            onNavigateToReportForm={handleNavigateToReportForm}
            onNavigateToDataSource={handleNavigateToDataSource}
            isDragEnabled={isDragEnabled}
            onToggleDrag={handleToggleDrag}
            isSimulationMode={isSimulationMode}
            selectedPointForSimulation={selectedPointForSimulation}
            profileView={profileView}
            onProfileViewChange={setProfileView}
            activeReportTab={activeReportTab}
            activeAdminTab={activeAdminTab}
            dateFilter={dateFilter}
            onRefreshReports={onRefreshReports}
            isRefreshingReports={isRefreshingReports}
            profile={profile}
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
            isFloodPropagationActive={isFloodPropagationActive}
            onToggleFloodPropagation={onToggleFloodPropagation}
            isFloodScenarioLoading={isFloodScenarioLoading}
          />
        </div>
      </div>
    </div>
  );
}
