/**
 * The full address of the view the panel is showing. Empty until the origin
 * is known, which is only in the browser.
 */
export function viewLink(origin: string, pathname: string, query = ''): string {
  if (!origin) return '';
  return `${origin}${pathname}${query ? `?${query}` : ''}`;
}

/** The link bar prints "https://" itself, so it is given the rest. */
export function withoutScheme(link: string): string {
  return link.replace(/^https?:\/\//, '');
}
