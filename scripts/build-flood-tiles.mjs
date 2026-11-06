// Builds the flood-hazard map overlay as static vector tiles.
//
// Input: data/flood-hazard/<SCENARIO>.geojson, one FeatureCollection of
// Polygons per return period, as the researchers export them (any extra
// properties, any coordinate precision). Output: public/flood-hazard/
// <hash>/<SCENARIO>/<z>/<x>/<y>.pbf (zoom 10 to 14, layer `flood_hazard`,
// property `Var`) and public/flood-hazard/manifest.json, which the map reads
// (lib/map/flood-hazard-manifest.ts). <hash> is the first 10 hex characters
// of the source file's SHA-256, so a changed file ships under a new path and
// the tiles can be cached forever (next.config.ts).
//
// Runs before `next build` and `next dev` (package.json `prebuild`,
// `predev`), so a new researcher file becomes tiles on the next deploy with
// no manual step. A scenario whose tiles already exist (a `.done` marker
// under its hash) is skipped; `public/flood-hazard/` is not in git.
//
// Usage: node scripts/build-flood-tiles.mjs [--in <dir>] [--out <dir>]
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, join } from 'node:path';
import GeoJSONVT from 'geojson-vt';
import vtpbf from 'vt-pbf';

import {
  boundsOf,
  mergeRuns,
  slimFeature,
  tilesInBounds,
} from './flood-tiles-lib.mjs';

const MINZOOM = 10;
const MAXZOOM = 14;
const LAYER = 'flood_hazard';

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i === -1 ? fallback : process.argv[i + 1];
}
const IN_DIR = arg('--in', 'data/flood-hazard');
const OUT_DIR = arg('--out', 'public/flood-hazard');

/** Scenarios sorted by the number in their name (5YR before 15YR). */
function scenarioFiles() {
  return readdirSync(IN_DIR)
    .filter((f) => f.endsWith('.geojson'))
    .map((f) => ({ id: basename(f, '.geojson'), path: join(IN_DIR, f) }))
    .sort((a, b) => parseInt(a.id, 10) - parseInt(b.id, 10));
}

/** Remove this scenario's tiles under every other hash. */
function dropStaleTiles(id, hash) {
  if (!existsSync(OUT_DIR)) return;
  for (const dir of readdirSync(OUT_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory() || dir.name === hash) continue;
    const stale = join(OUT_DIR, dir.name, id);
    if (!existsSync(stale)) continue;
    rmSync(stale, { recursive: true, force: true });
    if (readdirSync(join(OUT_DIR, dir.name)).length === 0) {
      rmSync(join(OUT_DIR, dir.name), { recursive: true, force: true });
    }
  }
}

function buildScenario({ id, path }) {
  const started = Date.now();
  const bytes = readFileSync(path);
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 10);
  const tileDir = join(OUT_DIR, hash, id);
  dropStaleTiles(id, hash);

  const data = JSON.parse(bytes.toString('utf8'));
  if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    throw new Error(`${path}: not a FeatureCollection`);
  }
  const slim = data.features.map(slimFeature).filter(Boolean);
  const features = mergeRuns(slim);
  const bounds = boundsOf(features);
  const entry = {
    tiles: `/flood-hazard/${hash}/${id}/{z}/{x}/{y}.pbf`,
    minzoom: MINZOOM,
    maxzoom: MAXZOOM,
    bounds,
    features: features.length,
  };
  if (features.length > slim.length / 2) {
    console.log(
      `${id}: only ${slim.length - features.length} of ${slim.length} cells merged into runs (scattered cells; harmless)`
    );
  }
  if (existsSync(join(tileDir, '.done'))) {
    console.log(`${id}: tiles for ${hash} already built, skipped`);
    return entry;
  }

  const index = new GeoJSONVT(
    { type: 'FeatureCollection', features },
    {
      maxZoom: MAXZOOM,
      indexMaxZoom: MAXZOOM,
      indexMaxPoints: 0,
      tolerance: 0,
      extent: 4096,
      buffer: 64,
    }
  );
  let written = 0;
  let total = 0;
  let biggest = 0;
  for (const { z, x, y } of tilesInBounds(bounds, MINZOOM, MAXZOOM)) {
    const tile = index.getTile(z, x, y);
    if (!tile || tile.features.length === 0) continue;
    const pbf = vtpbf.fromGeojsonVt({ [LAYER]: tile }, { version: 2 });
    const dir = join(tileDir, String(z), String(x));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${y}.pbf`), pbf);
    written += 1;
    total += pbf.length;
    if (pbf.length > biggest) biggest = pbf.length;
  }
  writeFileSync(join(tileDir, '.done'), '');
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `${id}: ${data.features.length} -> ${features.length} features after merge,` +
      ` ${written} tiles, ${(total / 1e6).toFixed(2)} MB total,` +
      ` biggest ${(biggest / 1e3).toFixed(0)} kB, ${seconds} s`
  );
  return entry;
}

const scenarios = {};
for (const file of scenarioFiles()) scenarios[file.id] = buildScenario(file);
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  join(OUT_DIR, 'manifest.json'),
  JSON.stringify({ version: 1, scenarios }, null, 2) + '\n'
);
console.log(
  `manifest: ${Object.keys(scenarios).join(', ') || 'no scenarios'} -> ${join(OUT_DIR, 'manifest.json')}`
);
