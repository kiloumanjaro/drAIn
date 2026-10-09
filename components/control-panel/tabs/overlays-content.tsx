'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { OverlayLegend } from '@/components/map/overlay-legend';
import { FloodScenarioCard } from '@/components/map/flood-scenario-card';
import { PopulationToggle } from '@/components/map/population-toggle';
import { FloodProneToggle } from '@/components/map/flood-prone-toggle';

// The only two cards here that draw with recharts. Loaded after the panel so
// the layer switches don't wait on the chart library; each placeholder is
// about the height of the card it stands in for, so the cards below don't
// jump when it arrives.
const ChartPieDonutText = dynamic(
  () =>
    import('@/components/control-panel/components/chart-pie').then(
      (m) => m.ChartPieDonutText
    ),
  {
    ssr: false,
    loading: () => (
      <div className="bg-card h-[318px] animate-pulse rounded-xl border border-[#ced1cd]" />
    ),
  }
);
const ReportsToggle = dynamic(
  () => import('@/components/map/reports-toggle').then((m) => m.ReportsToggle),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] animate-pulse rounded-xl border border-[#e2e2e2] bg-[#f7f7f7]" />
    ),
  }
);

interface OverlayContentProps {
  overlays: {
    id: string;
    name: string;
    color: string;
    visible: boolean;
  }[];
  onToggleOverlay: (id: string) => void;
  selectedFloodScenario?: string;
  onChangeFloodScenario?: (id: string) => void;
  onNavigateToTable?: (
    dataset: 'inlets' | 'outlets' | 'storm_drains' | 'man_pipes'
  ) => void;
  onNavigateToReportForm?: () => void;
  onNavigateToDataSource?: () => void;
  searchTerm?: string;
  isDragEnabled?: boolean;
  onToggleDrag?: (enabled: boolean) => void;
  isSimulationMode?: boolean;
  isFloodScenarioLoading?: boolean;
  floodProneAreas?: {
    id: string;
    name: string;
    color: string;
    visible: boolean;
  }[];
  onToggleFloodProneArea?: (id: string) => void;
}

type ComponentId =
  | 'chart'
  | 'layers'
  | 'reports'
  | 'flood'
  | 'population'
  | 'floodprone';

interface ComponentMetadata {
  id: ComponentId;
  keywords: string[];
  component: React.ReactNode;
}

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  isDragEnabled: boolean;
}

function SortableItem({ id, children, isDragEnabled }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isDragEnabled });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      {isDragEnabled ? (
        <>
          {/* Gray overlay when unlocked (drag mode active) */}
          <div className="pointer-events-none absolute inset-0 z-10 rounded-xl bg-gray-100/50 dark:bg-gray-900/20" />

          {/* Centered grip when unlocked - always visible and draggable */}
          <div
            className="absolute inset-0 z-20 flex cursor-grab items-center justify-center active:cursor-grabbing"
            {...attributes}
            {...listeners}
            aria-label="Reorder this overlay"
          ></div>

          {/* Disabled content when unlocked (drag mode) */}
          <div className="pointer-events-none">{children}</div>
        </>
      ) : (
        <>
          {/* Locked: normal component, no grip, fully interactive */}
          {children}
        </>
      )}
    </div>
  );
}

export default function OverlaysContent({
  overlays,
  onToggleOverlay,
  onNavigateToTable,
  selectedFloodScenario,
  onChangeFloodScenario,
  onNavigateToReportForm,
  onNavigateToDataSource,
  searchTerm = '',
  isDragEnabled = true,
  isSimulationMode = false,
  isFloodScenarioLoading = false,
  floodProneAreas = [],
  onToggleFloodProneArea,
}: OverlayContentProps) {
  const [componentOrder, setComponentOrder] = useState<ComponentId[]>([
    'chart',
    'layers',
    'flood',
    'floodprone',
    'population',
    'reports',
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: isDragEnabled ? undefined : { distance: 999999 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const componentsMetadata: ComponentMetadata[] = useMemo(
    () => [
      {
        id: 'chart' as ComponentId,
        keywords: [
          'drainage',
          'infrastructure',
          'statistics',
          'chart',
          'pipes',
          'inlets',
          'outlets',
          'drains',
          'donut',
          'pie',
          'graph',
          'visualization',
          'data',
          'count',
          'total',
          'distribution',
        ],
        component: <ChartPieDonutText onNavigate={onNavigateToTable} />,
      },
      {
        id: 'layers' as ComponentId,
        keywords: [
          'layers',
          'map',
          'toggle',
          'visibility',
          'overlays',
          'show',
          'hide',
          'legend',
          'controls',
          'switch',
        ],
        component: (
          <OverlayLegend
            overlays={overlays}
            onToggleOverlay={onToggleOverlay}
          />
        ),
      },
      {
        id: 'flood' as ComponentId,
        keywords: [
          'flood',
          'hazard',
          'scenario',
          'risk',
          'return',
          'period',
          'water',
          'inundation',
          '5yr',
          '15yr',
          '25yr',
          '50yr',
          '100yr',
          'year',
          'storm',
          'rainfall',
          'probability',
          'annual',
          'chance',
          'high',
          'medium',
          'low',
        ],
        // The simulation page has no stored hazard layer to switch.
        component: onChangeFloodScenario ? (
          <FloodScenarioCard
            isVisible={
              overlays.find((o) => o.id === 'flood_hazard-layer')?.visible ??
              true
            }
            onToggle={() => onToggleOverlay('flood_hazard-layer')}
            selectedScenario={selectedFloodScenario}
            onScenarioChange={onChangeFloodScenario}
            isLoading={isFloodScenarioLoading}
          />
        ) : null,
      },
      {
        id: 'population' as ComponentId,
        keywords: [
          'population',
          'barangay',
          'barangays',
          'density',
          'residents',
          'people',
          'demographics',
          'mandaue',
          'city',
          'area',
          'land',
        ],
        component: (
          <PopulationToggle
            isVisible={
              overlays.find((o) => o.id === 'mandaue_population-layer')
                ?.visible ?? true
            }
            onToggle={() => onToggleOverlay('mandaue_population-layer')}
            onNavigateToDataSource={onNavigateToDataSource}
          />
        ),
      },
      {
        id: 'floodprone' as ComponentId,
        keywords: [
          'flood',
          'prone',
          'area',
          'downstream',
          'south',
          'mc',
          'briones',
          'highway',
          'lh',
          'prime',
          'rolling',
          'hills',
          'east',
          'maguikay',
          'cabancalan',
          'tabok',
          'tingub',
          'butuanon',
          'paknaan',
          'basak',
          'pagsabungan',
          'barangay',
          'road',
        ],
        component: onToggleFloodProneArea ? (
          <FloodProneToggle
            floodProneAreas={floodProneAreas}
            onToggleFloodProneArea={onToggleFloodProneArea}
          />
        ) : null,
      },
      {
        id: 'reports' as ComponentId,
        keywords: [
          'reports',
          'issues',
          'user',
          'submissions',
          'problems',
          'complaints',
          'feedback',
          'form',
          'clogged',
          'damage',
          'overflow',
        ],
        component: (
          <ReportsToggle
            isVisible={
              overlays.find((o) => o.id === 'reports-layer')?.visible ?? true
            }
            onToggle={() => onToggleOverlay('reports-layer')}
            onNavigateToReportForm={onNavigateToReportForm}
            isSimulationMode={isSimulationMode}
          />
        ),
      },
    ],
    [
      overlays,
      onToggleOverlay,
      onNavigateToTable,
      onNavigateToReportForm,
      onNavigateToDataSource,
      isSimulationMode,
      selectedFloodScenario,
      onChangeFloodScenario,
      isFloodScenarioLoading,
      floodProneAreas,
      onToggleFloodProneArea,
    ]
  );

  // Calculate relevance scores and reorder based on search
  const orderedComponents = useMemo(() => {
    if (!searchTerm.trim()) {
      return componentOrder
        .map((id) => componentsMetadata.find((c) => c.id === id)!)
        .filter((c) => c.component !== null);
    }

    const query = searchTerm.toLowerCase();
    const scoredComponents = componentsMetadata.map((comp) => {
      const score = comp.keywords.reduce((total, keyword) => {
        if (keyword.includes(query)) {
          return total + (keyword.startsWith(query) ? 2 : 1);
        }
        return total;
      }, 0);
      return { ...comp, score };
    });

    return scoredComponents
      .filter((comp) => comp.score > 0 && comp.component !== null)
      .sort((a, b) => b.score - a.score);
  }, [searchTerm, componentOrder, componentsMetadata]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!isDragEnabled) return;

    const { active, over } = event;

    if (over && active.id !== over.id) {
      setComponentOrder((items) => {
        const oldIndex = items.indexOf(active.id as ComponentId);
        const newIndex = items.indexOf(over.id as ComponentId);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 overflow-hidden pr-3 pb-5 pl-5">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedComponents.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {orderedComponents.map((comp) => (
            <SortableItem
              key={comp.id}
              id={comp.id}
              isDragEnabled={isDragEnabled}
            >
              {comp.component}
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
