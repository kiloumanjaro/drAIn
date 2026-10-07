'use client';

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
// (Both are in the tables' class names below.)

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
          className={`pointer-events-auto absolute z-20 max-md:z-[35] md:pr-[70px] ${PHONE_PIN}`}
          style={{
            left: `${tablePosition.x}px`,
            top: `${tablePosition.y}px`,
          }}
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
          className={`pointer-events-auto absolute z-20 max-md:z-[35] md:pr-[70px] ${PHONE_PIN}`}
          style={{
            left: `${table3Position.x}px`,
            top: `${table3Position.y}px`,
          }}
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
            zIndex: 1000,
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
            zIndex: 1000,
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
