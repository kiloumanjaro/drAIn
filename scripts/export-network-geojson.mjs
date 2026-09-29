// Write public/drainage/*.geojson (what the map loads) from the database's
// one copy of the drainage network, public.components, through
// public.network_geojson. Run against the LOCAL stack after changing the
// network in the database:
//
//   node scripts/export-network-geojson.mjs           write the four files
//   node scripts/export-network-geojson.mjs --check   only compare; exit 1 if
//                                                      the files differ
//
// "Differ" means different features, properties or coordinates (to 1e-9):
// key order and number formatting don't count.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const TYPES = ['inlets', 'outlets', 'man_pipes', 'storm_drains'];
const check = process.argv.includes('--check');

const env = Object.fromEntries(
  execSync('npx supabase status -o env', {
    stdio: ['ignore', 'pipe', 'ignore'],
  })
    .toString()
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')];
    })
);
if (!/^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(env.API_URL ?? '')) {
  throw new Error('Refusing to run against anything but the local stack.');
}
// network_geojson is granted to the service role only.
const client = createClient(env.API_URL, env.SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const same = (a, b) => {
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a));
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => same(x, b[i]));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    return same(ka, kb) && ka.every((k) => same(a[k], b[k]));
  }
  return a === b;
};

// The layout the GIS export used: one feature per line.
const format = (collection) =>
  [
    '{',
    `"type": "FeatureCollection",`,
    `"name": ${JSON.stringify(collection.name)},`,
    `"crs": ${JSON.stringify(collection.crs)},`,
    '"features": [',
    collection.features.map((f) => JSON.stringify(f)).join(',\n'),
    ']',
    '}',
    '',
  ].join('\n');

let differences = 0;
for (const type of TYPES) {
  const { data, error } = await client.rpc('network_geojson', {
    p_type: type,
  });
  if (error) throw new Error(`${type}: ${error.message}`);
  const file = `public/drainage/${type}.geojson`;

  if (check) {
    const current = JSON.parse(fs.readFileSync(file, 'utf8'));
    const differing = data.features.filter(
      (f, i) =>
        !current.features[i] ||
        !same(f.properties, current.features[i].properties) ||
        !same(f.geometry, current.features[i].geometry)
    ).length;
    const count = data.features.length === current.features.length;
    const header = data.name === current.name && same(data.crs, current.crs);
    const ok = differing === 0 && count && header;
    if (!ok) differences++;
    console.log(
      `${ok ? 'same     ' : 'DIFFERENT'} ${file}: ${data.features.length} features in the database, ${current.features.length} in the file, ${differing} differing`
    );
  } else {
    fs.writeFileSync(file, format(data));
    console.log(`wrote ${file} (${data.features.length} features)`);
  }
}
if (check && differences) process.exit(1);
