// Re-exports the flood-hazard overlays in the form the map actually uses.
//
// The source exports carry ~14 decimal places per coordinate (hundredths of
// a nanometre) and eight properties per feature, of which the map's paint
// expression reads exactly one (`Var`, see getFloodHazardPaintConfig). That
// made the five scenarios ~210 MB raw / ~19 MB on the wire, with the default
// scenario auto-downloading on every map visit.
//
// This keeps 6 decimals (~10 cm) and only `Var`: measured ~65% smaller on
// the wire and about half the parse, with identical rendering. Output files
// are versioned (`.v2`) so they can be cached immutably; bump the version
// here and in floodHazardDataUrl (lib/map/layers.ts) when re-exporting.
//
// Usage: node scripts/slim-flood-hazard.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const VERSION = 'v2';
const SCENARIOS = ['5YR', '15YR', '25YR', '50YR', '100YR'];

const round6 = (n) => Math.round(n * 1e6) / 1e6;

/** One ring: rounded, consecutive duplicates removed, still closed. */
function slimRing(ring) {
  const out = [];
  for (const [x, y] of ring) {
    const point = [round6(x), round6(y)];
    const last = out[out.length - 1];
    if (!last || last[0] !== point[0] || last[1] !== point[1]) out.push(point);
  }
  // Rounding can open the ring (first and last no longer equal) — re-close.
  const [first, last] = [out[0], out[out.length - 1]];
  if (first && (first[0] !== last[0] || first[1] !== last[1])) out.push(first);
  // A valid ring needs at least a triangle plus the closing point.
  return out.length >= 4 ? out : null;
}

for (const scenario of SCENARIOS) {
  const path = `public/flood-hazard/${scenario} Flood Hazard.json`;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  let droppedRings = 0;
  let droppedFeatures = 0;

  const features = [];
  for (const feature of data.features) {
    const rings = [];
    for (const ring of feature.geometry.coordinates) {
      const slim = slimRing(ring);
      if (slim) rings.push(slim);
      else droppedRings += 1;
    }
    // The outer ring is first; a polygon reduced to nothing (well under
    // 10 cm across) can't render anyway.
    if (rings.length === 0) {
      droppedFeatures += 1;
      continue;
    }
    features.push({
      type: 'Feature',
      properties: { Var: feature.properties.Var },
      geometry: { type: 'Polygon', coordinates: rings },
    });
  }

  const out = JSON.stringify({ type: 'FeatureCollection', features });
  const outPath = `public/flood-hazard/${scenario} Flood Hazard.${VERSION}.json`;
  writeFileSync(outPath, out);

  const dist = (list) => {
    const counts = {};
    for (const f of list)
      counts[f.properties.Var] = (counts[f.properties.Var] ?? 0) + 1;
    return JSON.stringify(counts);
  };
  console.log(
    `${scenario}: ${data.features.length} -> ${features.length} features` +
      ` (dropped ${droppedFeatures} features, ${droppedRings} rings),` +
      ` Var in ${dist(data.features)} out ${dist(features)},` +
      ` ${(out.length / 1e6).toFixed(1)} MB raw`
  );
}
