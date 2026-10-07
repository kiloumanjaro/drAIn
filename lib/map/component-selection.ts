import type {
  DatasetType,
  Drain,
  Inlet,
  Outlet,
  Pipe,
} from '@/components/control-panel/types';

/** One drainage component, with the dataset it belongs to. */
export type ComponentRef =
  | { type: 'inlets'; item: Inlet }
  | { type: 'outlets'; item: Outlet }
  | { type: 'storm_drains'; item: Drain }
  | { type: 'man_pipes'; item: Pipe };

/** Every dataset's loaded rows, keyed by dataset. */
export interface ComponentLists {
  inlets: readonly Inlet[];
  outlets: readonly Outlet[];
  storm_drains: readonly Drain[];
  man_pipes: readonly Pipe[];
}

/** What the control panel's detail view shows: at most one is non-null. */
export interface SelectedComponents {
  inlets: Inlet | null;
  outlets: Outlet | null;
  storm_drains: Drain | null;
  man_pipes: Pipe | null;
}

export const NO_SELECTION: SelectedComponents = {
  inlets: null,
  outlets: null,
  storm_drains: null,
  man_pipes: null,
};

/** A selection holding only this component. */
export function selectionOf(component: ComponentRef): SelectedComponents {
  return { ...NO_SELECTION, [component.type]: component.item };
}

function isDatasetType(value: string): value is DatasetType {
  return Object.hasOwn(NO_SELECTION, value);
}

/**
 * The component with this id in the named dataset, or null when the dataset
 * name is not one of ours or nothing in it has the id. The name comes from
 * the URL or a report's category, hence a plain string.
 */
export function findComponent(
  lists: ComponentLists,
  type: string,
  id: string
): ComponentRef | null {
  if (!isDatasetType(type)) return null;
  const rows: readonly (Inlet | Outlet | Drain | Pipe)[] = lists[type];
  const item = rows.find((row) => row.id === id);
  return item ? ({ type, item } as ComponentRef) : null;
}

/**
 * Each dataset's click-target layer, and the GeoJSON property that holds the
 * component's id. The property differs per file, so it is spelled out.
 */
const HIT_LAYERS: Record<string, { type: DatasetType; idProperty: string }> = {
  'man_pipes-hit-layer': { type: 'man_pipes', idProperty: 'Name' },
  'inlets-hit-layer': { type: 'inlets', idProperty: 'In_Name' },
  'outlets-hit-layer': { type: 'outlets', idProperty: 'Out_Name' },
  'storm_drains-hit-layer': { type: 'storm_drains', idProperty: 'In_Name' },
};

/** The component a clicked map feature stands for, or null if none matches. */
export function componentAtHitLayer(
  lists: ComponentLists,
  layerId: string,
  properties: Record<string, unknown>
): ComponentRef | null {
  if (!Object.hasOwn(HIT_LAYERS, layerId)) return null;
  const { type, idProperty } = HIT_LAYERS[layerId];
  return findComponent(lists, type, properties[idProperty] as string);
}

/**
 * Where the camera goes for a component. A pipe is a line, so the camera
 * targets its midpoint; a pipe with no line has nowhere to go, which is the
 * only case that returns null.
 */
export function componentCenter(
  component: ComponentRef
): [number, number] | null {
  if (component.type === 'man_pipes') {
    const { coordinates } = component.item;
    if (!coordinates || coordinates.length === 0) return null;
    return coordinates[Math.floor(coordinates.length / 2)];
  }
  return component.item.coordinates;
}
