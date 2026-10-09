'use client';

import type { CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import { LinkParametersPanel } from '@/components/simulation/link-parameters-panel';
import { NodeParametersPanel } from '@/components/simulation/node-parameters-panel';
import { VulnerabilityDataTable } from '@/components/simulation/vulnerability-data-table';
import { Spinner } from '@/components/ui/spinner';
import type { Drain, Inlet } from '@/components/control-panel/types';
import type { useNodeSlideshow } from './use-node-slideshow';
import type { useParameterPanels } from './use-parameter-panels';
import type { useVulnerabilityTables } from './use-vulnerability-tables';

// The slideshow's chart is the page's only use of recharts, and it opens
// only when a node's results are asked for. It is a fixed overlay, so there
// is nothing in the layout to hold a place for while it loads.
const NodeSimulationSlideshow = dynamic(
  () =>
    import('@/components/simulation/node-simulation-slideshow').then(
      (m) => m.NodeSimulationSlideshow
    ),
  { ssr: false, loading: () => null }
);

interface SimulationOverlaysProps {
  tables: ReturnType<typeof useVulnerabilityTables>;
  slideshow: ReturnType<typeof useNodeSlideshow>;
  panels: ReturnType<typeof useParameterPanels>;
  inlets: Inlet[];
  drains: Drain[];
  onHighlightNodes: (nodeIds: Set<string>) => void;
}

// On phones a remembered or dragged pixel position can put a panel off the
// screen. There each one is pinned instead: under the navigation button, a
// little in from both edges. The classes are marked important to win over
// the inline position the larger layouts use.
const PHONE_PIN = 'max-md:fixed! max-md:inset-x-2! max-md:top-16!';

// A table stretches to the right edge of the map when its content is wide
// enough. From tablet width up the map buttons live in the last 70px, so the
// tables stop short of them; on phones the table sits above the buttons.
// (Both are in the tables' class names below.) That gap is part of the
// wrapper, so the wrapper lets clicks through to the map and the table
// itself takes them. The wrapper also ends at the right edge of the map,
// which is what the table measures its width against: it narrows to the
// room it has rather than running off screen, and scrolls inside.

// The parameter panels are fixed to the screen, so their z-index competes
// with everything on the page. 45 puts them over the map, its buttons (30)
// and the control panel (40 as the phone sheet), and under what must cover
// them: the phone navigation drawer, dialogs, menus and tooltips, all at 50.
const PARAMETER_PANEL_Z_INDEX = 45;

/** Everything that floats over the simulation map. */
export function SimulationOverlays({
  tables,
  slideshow,
  panels,
  inlets,
  drains,
  onHighlightNodes,
}: SimulationOverlaysProps) {
  const { tableData, tablePosition, tableData3, table3Position } = tables;
  const { slideshowNode, slideshowNodeData, slideshowAllData } = slideshow;
  const { activePanel, nodePanelPosition, linkPanelPosition } = panels;

  return (
    <>
      {/* Vulnerability Data Table Overlay (model 1) - Only render when NOT minimized */}
      {tableData && !tables.isTableMinimized && (
        <div
          className={`pointer-events-none absolute z-20 max-md:z-[35] md:right-0 md:pr-[70px] ${PHONE_PIN}`}
          style={
            {
              left: `${tablePosition.x}px`,
              top: `${tablePosition.y}px`,
              '--table-top': `${tablePosition.y}px`,
            } as CSSProperties
          }
        >
          {tables.isLoadingTable ? (
            <Spinner />
          ) : (
            <VulnerabilityDataTable
              data={tableData}
              ratingSource="stored"
              isMinimized={false}
              onToggleMinimize={tables.handleToggleTableMinimize}
              position={tablePosition}
              onPositionChange={tables.setTablePosition}
              onHighlightNodes={onHighlightNodes}
              onOpenNodeSimulation={slideshow.handleOpenNodeSimulation}
            />
          )}
        </div>
      )}

      {/* Vulnerability Data Table Overlay (model 2) - Only render when NOT minimized */}
      {tableData3 && !tables.isTable3Minimized && (
        <div
          className={`pointer-events-none absolute z-20 max-md:z-[35] md:right-0 md:pr-[70px] ${PHONE_PIN}`}
          style={
            {
              left: `${table3Position.x}px`,
              top: `${table3Position.y}px`,
              '--table-top': `${table3Position.y}px`,
            } as CSSProperties
          }
        >
          {tables.isLoadingTable3 ? (
            <Spinner />
          ) : (
            <VulnerabilityDataTable
              data={tableData3}
              ratingSource="live"
              modelInfo={tables.liveModelInfo}
              isMinimized={false}
              onToggleMinimize={tables.handleToggleTable3Minimize}
              position={table3Position}
              onPositionChange={tables.setTable3Position}
              onHighlightNodes={onHighlightNodes}
              onOpenNodeSimulation={slideshow.handleOpenNodeSimulation}
            />
          )}
        </div>
      )}

      {/* Node Simulation Slideshow */}
      {slideshowNode && slideshowNodeData && slideshowAllData && (
        <NodeSimulationSlideshow
          nodeId={slideshowNode}
          onClose={slideshow.handleCloseSlideshowNode}
          selectedYear={tables.selectedYear ?? undefined}
          nodeData={slideshowNodeData}
          allNodesData={slideshowAllData}
        />
      )}

      {/* Node Parameters Panel - Draggable */}
      {activePanel === 'node' && panels.selectedComponentIds.length > 0 && (
        <div
          className={PHONE_PIN}
          style={{
            position: 'fixed',
            left: nodePanelPosition.x,
            top: nodePanelPosition.y,
            zIndex: PARAMETER_PANEL_Z_INDEX,
          }}
        >
          <NodeParametersPanel
            selectedComponentIds={panels.selectedComponentIds}
            componentParams={panels.componentParams}
            onUpdateParam={panels.updateComponentParam}
            onClose={panels.closePanels}
            position={nodePanelPosition}
            onPositionChange={panels.setNodePanelPosition}
            inlets={inlets}
            drains={drains}
          />
        </div>
      )}

      {/* Link Parameters Panel - Draggable */}
      {activePanel === 'link' && panels.selectedPipeIds.length > 0 && (
        <div
          className={PHONE_PIN}
          style={{
            position: 'fixed',
            left: linkPanelPosition.x,
            top: linkPanelPosition.y,
            zIndex: PARAMETER_PANEL_Z_INDEX,
          }}
        >
          <LinkParametersPanel
            selectedPipeIds={panels.selectedPipeIds}
            pipeParams={panels.pipeParams}
            onUpdateParam={panels.updatePipeParam}
            onClose={panels.closePanels}
            position={linkPanelPosition}
            onPositionChange={panels.setLinkPanelPosition}
          />
        </div>
      )}
    </>
  );
}
