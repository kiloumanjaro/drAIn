/**
 * Escapes text for use inside HTML built as a string (map popups set
 * innerHTML). The values mostly come from GeoJSON files we ship, but are
 * escaped so that stays harmless if the source ever changes.
 */
export function escapeHtml(value: unknown): string {
  return String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!
  );
}
