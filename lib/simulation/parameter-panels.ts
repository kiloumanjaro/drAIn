import type {
  NodeParams,
  LinkParams,
} from '@/components/control-panel/tabs/simulation-models/model3';

/** Which parameter panel is open. Only one is at a time. */
export type ParameterPanel = 'node' | 'link' | null;

/**
 * The open panel after the number of selected items of one kind changes:
 * selecting any opens that kind's panel, and clearing them closes it if it
 * was the one open.
 */
export function panelAfterSelection(
  panel: ParameterPanel,
  kind: 'node' | 'link',
  selectedCount: number
): ParameterPanel {
  if (selectedCount > 0) return kind;
  return panel === kind ? null : panel;
}

/** How many components (node) and pipes (link) are selected for a run. */
export interface SelectionCounts {
  node: number;
  link: number;
}

/**
 * The open panel after the selection counts go from `previous` to `next`.
 * Only a count that changed has a say; components are considered first, so
 * when both change at once the pipes decide.
 */
export function panelAfterSelectionChange(
  panel: ParameterPanel,
  previous: SelectionCounts,
  next: SelectionCounts
): ParameterPanel {
  let result = panel;
  if (previous.node !== next.node) {
    result = panelAfterSelection(result, 'node', next.node);
  }
  if (previous.link !== next.link) {
    result = panelAfterSelection(result, 'link', next.link);
  }
  return result;
}

/** The open panel after its button is pressed: close it, or switch to it. */
export function panelAfterToggle(
  panel: ParameterPanel,
  kind: 'node' | 'link'
): ParameterPanel {
  return panel === kind ? null : kind;
}

// No invert elevation: left unset, the model keeps its own.
const BLANK_NODE_PARAMS = {
  init_depth: 0,
  ponding_area: 0,
  surcharge_depth: 0,
} satisfies NodeParams;

const BLANK_LINK_PARAMS = {
  init_flow: 0,
  upstrm_offset_depth: 0,
  downstrm_offset_depth: 0,
  avg_conduit_loss: 0,
} satisfies LinkParams;

/** A copy of the node parameters with one value set. */
export function withNodeParam(
  params: Map<string, NodeParams>,
  id: string,
  key: keyof NodeParams,
  value: number
): Map<string, NodeParams> {
  const next = new Map(params);
  next.set(id, { ...(next.get(id) ?? BLANK_NODE_PARAMS), [key]: value });
  return next;
}

/** A copy of the link parameters with one value set. */
export function withLinkParam(
  params: Map<string, LinkParams>,
  id: string,
  key: keyof LinkParams,
  value: number
): Map<string, LinkParams> {
  const next = new Map(params);
  next.set(id, { ...(next.get(id) ?? BLANK_LINK_PARAMS), [key]: value });
  return next;
}
