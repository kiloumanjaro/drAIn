/** A `/map?component=…&type=…` link, as the dashboard's report cards make. */
export interface ComponentLink {
  type: string;
  id: string;
  /** Tells one link from another, so each is acted on once. */
  key: string;
}

/** The component the address asks for, or null when it names none. */
export function readComponentLink(params: {
  get(name: string): string | null;
}): ComponentLink | null {
  const id = params.get('component');
  const type = params.get('type');
  if (!id || !type) return null;
  return { type, id, key: `${type}:${id}` };
}

/**
 * The control panel tab a component link opens. Staff get the Admin tab,
 * where the component's maintenance and report history are; everyone else
 * gets Stats, which shows the component's details. Admin is of no use to a
 * citizen or a signed-out visitor.
 */
export function componentLinkTab(isStaff: boolean): 'admin' | 'stats' {
  return isStaff ? 'admin' : 'stats';
}
