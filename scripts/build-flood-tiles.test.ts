import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const SCRIPT = join(__dirname, 'build-flood-tiles.mjs');

/** A 5x4 block of 10 m cells, two Var values, as a researcher export. */
function fixture() {
  const step = 0.00009;
  const features = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const x0 = 123.93 + col * step;
      const y0 = 10.33 + row * step;
      features.push({
        type: 'Feature',
        properties: { OBJECTID: features.length, Var: row < 2 ? 2 : 3 },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [x0, y0],
              [x0, y0 + step],
              [x0 + step, y0 + step],
              [x0 + step, y0],
              [x0, y0],
            ].map(([x, y]) => [x + 1e-12, y - 1e-12]),
          ],
        },
      });
    }
  }
  return { type: 'FeatureCollection', features };
}

function pbfFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.pbf'))
    .map((f) => join(dir, f));
}

let root: string;
let inDir: string;
let outDir: string;
let output: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'flood-tiles-'));
  inDir = join(root, 'in');
  outDir = join(root, 'out');
  mkdirSync(inDir);
  writeFileSync(join(inDir, '5YR.geojson'), JSON.stringify(fixture()));
  output = execFileSync(
    process.execPath,
    [SCRIPT, '--in', inDir, '--out', outDir],
    { encoding: 'utf8' }
  );
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('build-flood-tiles', () => {
  it('writes a manifest with the scenario, its hash and bounds', () => {
    const manifest = JSON.parse(
      readFileSync(join(outDir, 'manifest.json'), 'utf8')
    );
    expect(manifest.version).toBe(1);
    const scenario = manifest.scenarios['5YR'];
    expect(scenario.tiles).toMatch(
      /^\/flood-hazard\/[0-9a-f]{10}\/5YR\/\{z\}\/\{x\}\/\{y\}\.pbf$/
    );
    expect(scenario.minzoom).toBe(10);
    expect(scenario.maxzoom).toBe(14);
    const [w, s, e, n] = scenario.bounds;
    expect(w).toBeCloseTo(123.93, 5);
    expect(s).toBeCloseTo(10.33, 5);
    expect(e).toBeGreaterThan(w);
    expect(n).toBeGreaterThan(s);
    // 20 cells in two bands of two rows merge into one rectangle per row.
    expect(scenario.features).toBe(4);
    expect(output).toContain('5YR: 20 -> 4 features');
  });

  it('writes non-empty tiles whose flood_hazard layer carries Var', () => {
    const files = pbfFiles(outDir);
    expect(files.length).toBeGreaterThan(0);
    const z14 = files.find((f) => /[\\/]14[\\/]/.test(f))!;
    expect(statSync(z14).size).toBeGreaterThan(0);
    const tile = new VectorTile(new PbfReader(readFileSync(z14)));
    const layer = tile.layers['flood_hazard'];
    expect(layer).toBeDefined();
    expect(layer.length).toBeGreaterThan(0);
    const vars = new Set<number>();
    for (let i = 0; i < layer.length; i++) {
      vars.add(layer.feature(i).properties['Var'] as number);
    }
    expect([...vars].sort()).toEqual([2, 3]);
  });

  it('skips a scenario whose tiles are already built, and drops stale hashes', () => {
    const hashDir = readdirSync(outDir).find((d) => d !== 'manifest.json')!;
    expect(existsSync(join(outDir, hashDir, '5YR', '.done'))).toBe(true);
    // A stale folder from an earlier version of the file.
    mkdirSync(join(outDir, '0000000000', '5YR'), { recursive: true });

    const again = execFileSync(
      process.execPath,
      [SCRIPT, '--in', inDir, '--out', outDir],
      { encoding: 'utf8' }
    );
    expect(again).toContain('already built, skipped');
    expect(existsSync(join(outDir, '0000000000'))).toBe(false);
  });

  it('refuses a file that is not a FeatureCollection', () => {
    const badIn = join(root, 'bad');
    mkdirSync(badIn);
    writeFileSync(join(badIn, '7YR.geojson'), '{"type":"Feature"}');
    expect(() =>
      execFileSync(
        process.execPath,
        [SCRIPT, '--in', badIn, '--out', join(root, 'bad-out')],
        { encoding: 'utf8', stdio: 'pipe' }
      )
    ).toThrow(/not a FeatureCollection/);
  });
});
