// The pure parts of scripts/build-flood-tiles.mjs, kept apart so vitest can
// test them (scripts/flood-tiles-lib.test.ts) while the script itself runs
// under plain Node before `next build`.

export const round6 = (n) => Math.round(n * 1e6) / 1e6;

/**
 * The exporter writes a 10 m grid, but after rounding to 6 decimals two cells
 * that share an edge can differ by a millionth of a degree (about 10 cm).
 * Anything within this of equal is treated as equal.
 */
export const EPS = 2e-6;

/** One ring: rounded, consecutive duplicates removed, still closed. */
export function slimRing(ring) {
  const out = [];
  for (const [x, y] of ring) {
    const point = [round6(x), round6(y)];
    const last = out[out.length - 1];
    if (!last || last[0] !== point[0] || last[1] !== point[1]) out.push(point);
  }
  // Rounding can open the ring (first and last no longer equal): re-close.
  const [first, last] = [out[0], out[out.length - 1]];
  if (first && (first[0] !== last[0] || first[1] !== last[1])) out.push(first);
  // A valid ring needs at least a triangle plus the closing point.
  return out.length >= 4 ? out : null;
}

/**
 * A feature with only `Var` and 6-decimal coordinates, or null when every
 * ring collapses on rounding (well under 10 cm across; cannot render).
 * Accepts the slimmed files and a raw researcher export alike.
 */
export function slimFeature(feature) {
  if (feature?.geometry?.type !== 'Polygon') {
    throw new Error(`expected a Polygon, got ${feature?.geometry?.type}`);
  }
  const rings = [];
  for (const ring of feature.geometry.coordinates) {
    const slim = slimRing(ring);
    if (slim) rings.push(slim);
  }
  if (rings.length === 0) return null;
  return {
    type: 'Feature',
    properties: { Var: feature.properties?.Var ?? null },
    geometry: { type: 'Polygon', coordinates: rings },
  };
}

/** The bounding box of a single-ring, 5-point, axis-aligned rectangle; else null. */
function rectangleOf(feature) {
  const rings = feature.geometry.coordinates;
  if (rings.length !== 1 || rings[0].length !== 5) return null;
  const xs = rings[0].slice(0, 4).map((p) => p[0]);
  const ys = rings[0].slice(0, 4).map((p) => p[1]);
  const xmin = Math.min(...xs);
  const xmax = Math.max(...xs);
  const ymin = Math.min(...ys);
  const ymax = Math.max(...ys);
  // Axis-aligned: every corner sits on xmin or xmax, and on ymin or ymax.
  const near = (a, b) => Math.abs(a - b) <= EPS;
  for (let i = 0; i < 4; i++) {
    if (!(near(xs[i], xmin) || near(xs[i], xmax))) return null;
    if (!(near(ys[i], ymin) || near(ys[i], ymax))) return null;
  }
  if (xmax - xmin <= EPS || ymax - ymin <= EPS) return null;
  return { xmin, xmax, ymin, ymax };
}

function rectangleFeature(Var, { xmin, xmax, ymin, ymax }) {
  return {
    type: 'Feature',
    properties: { Var },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [xmin, ymin],
          [xmax, ymin],
          [xmax, ymax],
          [xmin, ymax],
          [xmin, ymin],
        ],
      ],
    },
  };
}

/**
 * Merge runs of neighbouring grid cells into one rectangle each.
 *
 * Cells are clustered into rows by ymin (within EPS), then per `Var` sorted
 * by xmin; a cell joins the run before it when its xmin meets the run's xmax
 * and its ymax matches (both within EPS). Anything that is not a single
 * axis-aligned rectangle passes through untouched. Correctness does not
 * depend on how much merges; it only makes the tiles smaller.
 */
export function mergeRuns(features) {
  const out = [];
  const rects = [];
  for (const feature of features) {
    const rect = rectangleOf(feature);
    if (rect) rects.push({ ...rect, Var: feature.properties.Var });
    else out.push(feature);
  }
  rects.sort((a, b) => a.ymin - b.ymin);
  const rows = [];
  let row = null;
  for (const rect of rects) {
    if (!row || rect.ymin - row[0].ymin > EPS) rows.push((row = []));
    row.push(rect);
  }
  for (const cells of rows) {
    const byVar = new Map();
    for (const cell of cells) {
      let list = byVar.get(cell.Var);
      if (!list) byVar.set(cell.Var, (list = []));
      list.push(cell);
    }
    for (const [Var, list] of byVar) {
      list.sort((a, b) => a.xmin - b.xmin);
      let run = { ...list[0] };
      for (let i = 1; i < list.length; i++) {
        const next = list[i];
        if (
          Math.abs(next.xmin - run.xmax) <= EPS &&
          Math.abs(next.ymax - run.ymax) <= EPS
        ) {
          run.xmax = next.xmax;
        } else {
          out.push(rectangleFeature(Var, run));
          run = { ...next };
        }
      }
      out.push(rectangleFeature(Var, run));
    }
  }
  return out;
}

/** The [w, s, e, n] bounding box of a list of polygon features. */
export function boundsOf(features) {
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  for (const feature of features) {
    for (const ring of feature.geometry.coordinates) {
      for (const [x, y] of ring) {
        if (x < w) w = x;
        if (x > e) e = x;
        if (y < s) s = y;
        if (y > n) n = y;
      }
    }
  }
  return [w, s, e, n];
}

/** Web Mercator tile column and row (XYZ, top-left origin) of a point. */
export function tileOf(lon, lat, z) {
  const scale = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * scale);
  const rad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * scale
  );
  const clamp = (v) => Math.min(scale - 1, Math.max(0, v));
  return { x: clamp(x), y: clamp(y) };
}

/** Every tile from zoom `minzoom` to `maxzoom` that touches `bounds`. */
export function tilesInBounds([w, s, e, n], minzoom, maxzoom) {
  const tiles = [];
  for (let z = minzoom; z <= maxzoom; z++) {
    const a = tileOf(w, n, z); // top-left
    const b = tileOf(e, s, z); // bottom-right
    for (let x = a.x; x <= b.x; x++) {
      for (let y = a.y; y <= b.y; y++) tiles.push({ z, x, y });
    }
  }
  return tiles;
}
