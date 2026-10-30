import { useState } from 'react';
import type {
  NodeParams,
  LinkParams,
} from '@/components/control-panel/tabs/simulation-models/model3';
import { usePersistentPosition } from '@/hooks/use-persistent-position';
import {
  panelAfterSelectionChange,
  panelAfterToggle,
  withLinkParam,
  withNodeParam,
  type ParameterPanel,
  type SelectionCounts,
} from '@/lib/simulation/parameter-panels';
import type { RainfallData } from '@/lib/simulation-api/simulation';

type RainfallParams = Required<RainfallData>;

const DEFAULT_RAINFALL: RainfallParams = {
  total_precip: 140,
  duration_hr: 1,
};

/**
 * Node and link parameter panels open centred where that is clear of the
 * control panel, and just right of it otherwise. They are 450px to 600px
 * wide and fixed to the screen.
 */
const PARAMETER_PANEL_ANCHOR = {
  width: 500,
  height: 600,
  minWidth: 450,
  fullWidth: 600,
  fixed: true,
};

/**
 * What a custom run is made from: the components and pipes picked for it,
 * the values set on each, and the rainfall. Also which of the two floating
 * parameter panels is open and where each sits.
 */
export function useParameterPanels() {
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>(
    []
  );
  const [selectedPipeIds, setSelectedPipeIds] = useState<string[]>([]);
  const [componentParams, setComponentParams] = useState<
    Map<string, NodeParams>
  >(new Map());
  const [pipeParams, setPipeParams] = useState<Map<string, LinkParams>>(
    new Map()
  );
  const [rainfallParams, setRainfallParams] =
    useState<RainfallParams>(DEFAULT_RAINFALL);

  // Panel visibility - mutual exclusivity
  const [activePanel, setActivePanel] = useState<ParameterPanel>(null);

  // Panel positions (persisted in localStorage)
  const [nodePanelPosition, setNodePanelPosition] = usePersistentPosition(
    'nodePanelPosition',
    PARAMETER_PANEL_ANCHOR
  );
  const [linkPanelPosition, setLinkPanelPosition] = usePersistentPosition(
    'linkPanelPosition',
    PARAMETER_PANEL_ANCHOR
  );

  // Selecting components opens the node panel and selecting pipes the link
  // panel; clearing either closes its panel. Worked out while rendering,
  // from the counts last seen, so the panel changes in the same paint as
  // the selection.
  const counts: SelectionCounts = {
    node: selectedComponentIds.length,
    link: selectedPipeIds.length,
  };
  const [seenCounts, setSeenCounts] = useState(counts);
  if (seenCounts.node !== counts.node || seenCounts.link !== counts.link) {
    setSeenCounts(counts);
    setActivePanel(panelAfterSelectionChange(activePanel, seenCounts, counts));
  }

  const handleToggleNodePanel = () =>
    setActivePanel(panelAfterToggle(activePanel, 'node'));

  const handleToggleLinkPanel = () =>
    setActivePanel(panelAfterToggle(activePanel, 'link'));

  const closePanels = () => setActivePanel(null);

  // Both updates work from the latest state, not this render's: two quick
  // edits used to lose the first.
  const updateComponentParam = (
    id: string,
    key: keyof NodeParams,
    value: number
  ) => {
    setComponentParams((previous) => withNodeParam(previous, id, key, value));
  };

  const updatePipeParam = (
    id: string,
    key: keyof LinkParams,
    value: number
  ) => {
    setPipeParams((previous) => withLinkParam(previous, id, key, value));
  };

  return {
    selectedComponentIds,
    setSelectedComponentIds,
    selectedPipeIds,
    setSelectedPipeIds,
    componentParams,
    setComponentParams,
    pipeParams,
    setPipeParams,
    rainfallParams,
    setRainfallParams,

    activePanel,
    closePanels,
    handleToggleNodePanel,
    handleToggleLinkPanel,
    nodePanelPosition,
    setNodePanelPosition,
    linkPanelPosition,
    setLinkPanelPosition,
    updateComponentParam,
    updatePipeParam,
  };
}
