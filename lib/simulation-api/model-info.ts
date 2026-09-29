/**
 * What a flood-hazard rating can and cannot claim.
 *
 * A live run's result carries this in `metadata.model_info`, built by the
 * simulation server from the numbers the scorer actually uses
 * (drAIn-backend drain/model_info.py). The stored per-storm scenarios have
 * no such block, so FALLBACK_MODEL_INFO mirrors it for them.
 */

export interface ModelInfo {
  network: string;
  /** When the network file was generated from GIS data (YYYY-MM-DD). */
  network_built_on: string | null;
  /**
   * SHA-256 of the network file a live run used. Runs with the same one
   * used the same model. Absent for the stored scenarios, whose network
   * file isn't recorded.
   */
  network_sha256?: string | null;
  calibrated: boolean;
  hazard_score: {
    weights: Record<string, number>;
    full_scale: Record<string, number>;
    category_thresholds: Record<string, number>;
    provisional: boolean;
  };
  exposure: string;
  not_modelled: string[];
}

export const FALLBACK_MODEL_INFO: ModelInfo = {
  network: 'Mandaue City drainage network (SWMM)',
  network_built_on: '2025-11-18',
  calibrated: false,
  hazard_score: {
    weights: {
      flood_volume: 0.5,
      duration_share_of_storm: 0.3,
      peak_rate: 0.2,
    },
    full_scale: { flood_volume_megalitres: 45, peak_rate_cms: 1 },
    category_thresholds: { High: 0.5, Medium: 0.25, Low: 0 },
    provisional: true,
  },
  exposure:
    'Population density of the barangay a node is in, not people in the flood.',
  not_modelled: [
    'Blocked or silted drains: every pipe is modelled clean.',
    'High tide or storm surge at the outfalls: they discharge freely.',
    'Ground already wet from earlier rain.',
    'Real storm timing: the storm is an idealised triangle.',
    'Changes to the city since the network was built.',
  ],
};

/** The block from a simulation response, if it has a usable one. */
export function readModelInfo(response: unknown): ModelInfo | null {
  const metadata = (response as { metadata?: { model_info?: unknown } })
    ?.metadata;
  const info = metadata?.model_info as Partial<ModelInfo> | undefined;
  if (
    !info ||
    typeof info.calibrated !== 'boolean' ||
    !Array.isArray(info.not_modelled) ||
    !info.hazard_score
  ) {
    return null;
  }
  return info as ModelInfo;
}

/** Where a table's ratings came from. */
export type RatingSource = 'stored' | 'live';

function formatBuiltOn(date: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** One line to show beside the ratings. */
export function caveatHeadline(info: ModelInfo): string {
  const parts = ['Simulated, not observed'];
  const built = formatBuiltOn(info.network_built_on);
  if (built) parts.push(`network model from ${built}`);
  if (!info.calibrated) parts.push('not checked against field records');
  if (info.hazard_score.provisional) parts.push('provisional thresholds');
  return parts.join(' · ');
}

const percent = (share: number | undefined) =>
  `${Math.round((share ?? 0) * 100)}%`;

/** The longer explanation, as short paragraphs. */
export function caveatDetails(info: ModelInfo, source: RatingSource): string[] {
  const { weights, full_scale } = info.hazard_score;
  const details = [
    '"No hazard" means this model did not flood the node in this storm, not that the drain is safe.',
  ];
  if (source === 'stored') {
    details.push(
      'These stored design storms were rated by an earlier clustering model. A custom run uses the current hazard score, so compare nodes within one table, not across the two.'
    );
  } else {
    details.push(
      `Hazard weighs flood volume ${percent(weights.flood_volume)}, time flooded as a share of the storm ${percent(weights.duration_share_of_storm)} and peak overflow rate ${percent(weights.peak_rate)}, each against a reference of ${full_scale.flood_volume_megalitres} ML and ${full_scale.peak_rate_cms} m³/s. The references come from the model's own baseline run, not from a study of flood damage, so the order of the list can change when they do.`
    );
  }
  details.push(`Exposure: ${info.exposure}`);
  if (info.network_sha256) {
    details.push(
      `Model version ${info.network_sha256.slice(0, 8)}: a fingerprint of the network file. Runs showing the same one used the same model.`
    );
  }
  return details;
}
