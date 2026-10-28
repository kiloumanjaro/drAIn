/** The four hazard bands a node can fall into. */
export type HazardLevel = 'high' | 'medium' | 'low' | 'none';

export interface HazardBand {
  level: HazardLevel;
  /** The label the stored scenarios use; a live run says "High" and so on. */
  label: string;
  /** Node fill (Mapbox circle paint). */
  fill: string;
  /** Darker node stroke. */
  stroke: string;
  /** The fill as `rgb(r, g, b)`, the form the flood lines are drawn in. */
  rgb: string;
}

export const HAZARD_BANDS: Record<HazardLevel, HazardBand> = {
  high: {
    level: 'high',
    label: 'High Risk',
    fill: '#D32F2F',
    stroke: '#8B0000',
    rgb: 'rgb(211, 47, 47)',
  },
  medium: {
    level: 'medium',
    label: 'Medium Risk',
    fill: '#FFA000',
    stroke: '#B36200',
    rgb: 'rgb(255, 160, 0)',
  },
  low: {
    level: 'low',
    label: 'Low Risk',
    fill: '#FFF176',
    stroke: '#C4B000',
    rgb: 'rgb(255, 235, 100)',
  },
  none: {
    level: 'none',
    label: 'No Risk',
    fill: '#388E3C',
    stroke: '#1B5E20',
    rgb: 'rgb(56, 142, 60)',
  },
};

/** What a node is drawn in when its category is not one of the bands. */
export const HAZARD_FALLBACK_COLORS = {
  fill: '#5687ca',
  stroke: '#00346c',
  rgb: 'rgb(33, 150, 243)',
} as const;

/**
 * The band for a hazard category the backend sends.
 *
 * Two vocabularies are in use: a live simulation sends "High", "Medium",
 * "Low" and "No hazard", while the stored per-return-period scenarios say
 * "High Risk", "Medium Risk", "Low Risk" and "No Risk". Matching on the
 * exact string of one silently drops the other into the lowest band, so
 * this matches by substring, ignoring case and surrounding whitespace.
 * Anything else, missing included, is `null`: callers decide what an
 * unknown category looks like, never a band it is not.
 */
export function hazardBand(
  category: string | null | undefined
): HazardBand | null {
  const normalised = (category ?? '').trim().toLowerCase();
  if (normalised.includes('high')) return HAZARD_BANDS.high;
  if (normalised.includes('medium')) return HAZARD_BANDS.medium;
  if (normalised.includes('low')) return HAZARD_BANDS.low;
  if (normalised.includes('no')) return HAZARD_BANDS.none;
  return null;
}

/** Node fill for a category; the fallback colour when it is not a band. */
export function getColorForCategory(category: string): string {
  return hazardBand(category)?.fill ?? HAZARD_FALLBACK_COLORS.fill;
}

/** Node stroke for a category; the fallback colour when it is not a band. */
export function getStrokeColorForCategory(category: string): string {
  return hazardBand(category)?.stroke ?? HAZARD_FALLBACK_COLORS.stroke;
}

function parseRgb(color: string): [number, number, number] | null {
  const rgb = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  }
  return null;
}

/**
 * The band a drawn colour came from: the flood lines between two nodes are
 * a gradient between their bands' colours, so a segment's colour is the
 * nearest band colour. `null` for a colour that cannot be read.
 */
export function hazardBandFromColor(color: string): HazardBand | null {
  const rgb = parseRgb(color);
  if (!rgb) return null;
  let nearest: HazardBand | null = null;
  let best = Infinity;
  for (const band of Object.values(HAZARD_BANDS)) {
    const [r, g, b] = parseRgb(band.rgb)!;
    const d = (r - rgb[0]) ** 2 + (g - rgb[1]) ** 2 + (b - rgb[2]) ** 2;
    if (d < best) {
      best = d;
      nearest = band;
    }
  }
  return nearest;
}
