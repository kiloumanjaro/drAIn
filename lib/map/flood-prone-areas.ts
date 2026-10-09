/**
 * The flood-prone areas overlaid on the public map.
 *
 * This is the single description of each area. The map layer, the overlay
 * toggle list and the "hide everything" reset are all derived from it, so
 * adding an area means adding one entry here.
 */
export interface FloodProneArea {
  /** Mapbox source and layer id, and the key in the visibility record. */
  id: string;
  /** Label shown in the overlays panel. */
  name: string;
  /** GeoJSON filename under /public/additional-overlays/flood-prone-area/. */
  file: string;
  color: string;
}

export const FLOOD_PRONE_AREAS: readonly FloodProneArea[] = [
  {
    id: 'downstream_south_area',
    name: 'Downstream South',
    // Note the spelling: the file on disk is "downsteam", not "downstream".
    file: 'downsteam_south_area.geojson',
    color: '#DC2626',
  },
  {
    id: 'mc_briones_highway',
    name: 'Briones Highway',
    file: 'mc_briones_highway.geojson',
    color: '#059669',
  },
  {
    id: 'lh_prime_area',
    name: 'LH Prime',
    file: 'lh_prime_area.geojson',
    color: '#0284C7',
  },
  {
    id: 'rolling_hills_area',
    name: 'Rolling Hills',
    file: 'rolling_hills_area.geojson',
    color: '#EA580C',
  },
  {
    id: 'downstream_east_area',
    name: 'Downstream East',
    file: 'downstream_east_area.geojson',
    color: '#0D9488',
  },
  {
    id: 'maguikay_cabancalan_tabok_tingub_butuaonon',
    name: 'Butuanon River',
    file: 'maguikay_cabancalan_tabok_tingub_butuaonon.geojson',
    color: '#D97706',
  },
  {
    id: 'paknaan_butuanon',
    name: 'Paknaan Basin',
    file: 'paknaan_butuanon.geojson',
    color: '#7C3AED',
  },
  {
    id: 'basak_pagsabungan',
    name: 'Basak & Pagsabungan',
    file: 'basak_pagsabungan.geojson',
    color: '#0891B2',
  },
  {
    id: 'maguikay_barangay_road',
    name: 'Maguikay Road',
    file: 'maguikay_barangay_road.geojson',
    color: '#DB2777',
  },
] as const;

export type FloodProneVisibility = Record<string, boolean>;

/** Every area hidden — the initial state, and the reset used when a map layer is switched on. */
export const ALL_FLOOD_PRONE_HIDDEN: FloodProneVisibility = Object.fromEntries(
  FLOOD_PRONE_AREAS.map((area) => [area.id, false])
);
