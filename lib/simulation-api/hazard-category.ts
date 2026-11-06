import { type HazardLevel, hazardBand } from './hazard-band';

export type { HazardLevel };

/**
 * Reduce a hazard category label to its band, for ranking and weighting,
 * where an unrecognised category (missing included) counts as no hazard.
 * See `hazardBand` for the matching rules.
 */
export function normaliseHazardCategory(
  category: string | null | undefined
): HazardLevel {
  return hazardBand(category)?.level ?? 'none';
}
