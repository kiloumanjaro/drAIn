"use client";

import { useState, useMemo } from "react";
import type { Report } from "@/lib/supabase/report";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { OverlayLegend } from "../../overlay-legend";
import { ChartPieDonutText } from "../../chart-pie";
import { ReportsToggle } from "../../reports-toggle";
import { FloodScenarioCard } from "../../flood-scenario-card";
import { PopulationToggle } from "../../population-toggle";

interface OverlayContentProps {
  overlays: {
    id: string;
    name: string;
    color: string;
    visible: boolean;
  }[];
  onToggleOverlay: (id: string) => void;
  selectedFloodScenario?: string,
  onChangeFloodScenario?: (id: string) => void;
  onNavigateToTable?: (
    dataset: "inlets" | "outlets" | "storm_drains" | "man_pipes"
  ) => void;
  onNavigateToReportForm?: () => void;
  searchTerm?: string;
  isDragEnabled?: boolean;
  onToggleDrag?: (enabled: boolean) => void;
  reports: Report[];
  isSimulationMode?: boolean;
}

type ComponentId = "chart" | "layers" | "reports" | "flood" | "population";

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
    <div ref={setNodeRef} style={style} className="relative group">
      {isDragEnabled ? (
        <>
          {/* Gray overlay when unlocked (drag mode active) */}
          <div className="absolute inset-0 bg-gray-100/50 dark:bg-gray-900/20 rounded-xl z-10 pointer-events-none" />

          {/* Centered grip when unlocked - always visible and draggable */}
          <div
            className="absolute inset-0 flex items-center justify-center z-20 cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
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
  searchTerm = "",
  isDragEnabled = true,
  reports,
  isSimulationMode = false,
}: OverlayContentProps) {
  const [componentOrder, setComponentOrder] = useState<ComponentId[]>([
    "chart",
    "layers",
    "flood",
    "population",
    "reports",
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
        id: "chart" as ComponentId,
        keywords: [
          "drainage",
          "infrastructure",
          "statistics",
          "chart",
          "pipes",
          "inlets",
          "outlets",
          "drains",
          "donut",
          "pie",
          "graph",
          "visualization",
          "data",
          "count",
          "total",
          "distribution",
        ],
        component: <ChartPieDonutText onNavigate={onNavigateToTable} />,
      },
      {
        id: "layers" as ComponentId,
        keywords: [
          "layers",
          "map",
          "toggle",
          "visibility",
          "overlays",
          "show",
          "hide",
          "legend",
          "controls",
          "switch",
        ],
        component: (
          <OverlayLegend
            overlays={overlays}
            onToggleOverlay={onToggleOverlay}
          />
        ),
      },
      {
        id: "flood" as ComponentId,
        keywords: [
          "flood",
          "hazard",
          "scenario",
          "risk",
          "return",
          "period",
          "water",
          "inundation",
          "5yr",
          "15yr",
          "25yr",
          "50yr",
          "100yr",
          "year",
          "storm",
          "rainfall",
          "probability",
          "annual",
          "chance",
          "high",
          "medium",
          "low",
        ],
        component: (
          <FloodScenarioCard
            isVisible={
              overlays.find((o) => o.id === "flood_hazard-layer")?.visible ??
              true
            }
            onToggle={() => onToggleOverlay("flood_hazard-layer")}
            selectedScenario={selectedFloodScenario}
            onScenarioChange={onChangeFloodScenario}
          />
        ),
      },
      {
        id: "population" as ComponentId,
        keywords: [
          "population",
          "barangay",
          "barangays",
          "density",
          "residents",
          "people",
          "demographics",
          "mandaue",
          "city",
          "area",
          "land",
        ],
        component: (
          <PopulationToggle
            isVisible={
              overlays.find((o) => o.id === "mandaue_population-layer")?.visible ?? true
            }
            onToggle={() => onToggleOverlay("mandaue_population-layer")}
          />
        ),
      },
      {
        id: "reports" as ComponentId,
        keywords: [
          "reports",
          "issues",
          "user",
          "submissions",
          "problems",
          "complaints",
          "feedback",
          "form",
          "clogged",
          "damage",
          "overflow",
        ],
        component: (
          <ReportsToggle
            isVisible={
              overlays.find((o) => o.id === "reports-layer")?.visible ?? true
            }
            onToggle={() => onToggleOverlay("reports-layer")}
            onNavigateToReportForm={onNavigateToReportForm}
            reports={reports}
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
      reports,
      isSimulationMode,
      selectedFloodScenario,
      onChangeFloodScenario,
    ]
  );

  // Calculate relevance scores and reorder based on search
  const orderedComponents = useMemo(() => {
    if (!searchTerm.trim()) {
      return componentOrder.map(
        (id) => componentsMetadata.find((c) => c.id === id)!
      );
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
      .filter((comp) => comp.score > 0)
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
    <div className="flex flex-col gap-4 pl-5 pb-5 pr-3 overflow-hidden">
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
