'use client';

import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDays } from '@/lib/dashboard/calculations';
import type { RepairTimeByComponentData } from '@/lib/dashboard/queries';
import { Droplet, Pipette, Wind, CircleDot, GripVertical } from 'lucide-react';
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

interface RepairTimeCardsProps {
  data: RepairTimeByComponentData[];
  loading?: boolean;
}

interface SortableItemProps {
  item: RepairTimeByComponentData;
}

const componentConfigs = {
  inlets: {
    icon: Droplet,
    label: 'Inlets',
  },
  outlets: {
    icon: Wind,
    label: 'Outlets',
  },
  storm_drains: {
    icon: Pipette,
    label: 'Storm Drains',
  },
  man_pipes: {
    icon: CircleDot,
    label: 'Man Pipes',
  },
};

function SortableItem({ item }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.type });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const config = componentConfigs[item.type as keyof typeof componentConfigs];
  const IconComponent = config?.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-[#ced1cd] bg-white p-4 transition-shadow hover:border-blue-400"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {IconComponent && <IconComponent className="h-5 w-5 text-gray-600" />}
          <p className="text-sm font-medium text-gray-600">
            {config?.label || item.type}
          </p>
        </div>
        <div
          className="cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-gray-900">
          {formatDays(item.averageDays)}
        </p>
        <p className="text-xs text-gray-500">
          {item.resolvedCount} resolved
        </p>
      </div>
    </div>
  );
}

export default function RepairTimeCards({
  data,
  loading = false,
}: RepairTimeCardsProps) {
  const [items, setItems] = useState<RepairTimeByComponentData[]>(data);

  useEffect(() => {
    if (data && data.length > 0) {
      setItems(data);
    }
  }, [data]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((currentItems) => {
        const oldIndex = currentItems.findIndex((item) => item.type === active.id);
        const newIndex = currentItems.findIndex((item) => item.type === over.id);
        return arrayMove(currentItems, oldIndex, newIndex);
      });
    }
  };
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-[#ced1cd] bg-white p-4"
          >
            <Skeleton className="mb-2 h-4 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  const displayData = items.length > 0 ? items : data;

  if (!displayData || displayData.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        <p>No repair time data available</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={displayData.map((item) => item.type)}
        strategy={verticalListSortingStrategy}
      >
        <div className="grid grid-cols-1 gap-4">
          {displayData.map((item) => (
            <SortableItem key={item.type} item={item} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
