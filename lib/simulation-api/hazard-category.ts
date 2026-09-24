/** The four hazard bands a node can fall into. */
export type HazardLevel = 'high' | 'medium' | 'low' | 'none';

/**
 * Reduce a hazard category label to its band.
 *
 * Two vocabularies are in use: a live simulation sends "High", "Medium",
 * "Low" and "No hazard", while the stored per-return-period scenarios say
 * "High Risk", "Medium Risk", "Low Risk" and "No Risk". Matching on the
 * exact string of one silently drops the other into the lowest band, so
 * this matches by substring, ignoring case and surrounding whitespace.
 * Anything unrecognised, missing included, counts as no hazard.
 */
export function normaliseHazardCategory(
  category: string | null | undefined
): HazardLevel {
  const normalised = (category ?? '').trim().toLowerCase();
  if (normalised.includes('high')) return 'high';
  if (normalised.includes('medium')) return 'medium';
  if (normalised.includes('low')) return 'low';
  return 'none';
}
