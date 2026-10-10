// Save one PNG of whatever the shots browser is showing right now.
//
//   pnpm screenshot <name>                  screenshots/manual/<name>.png
//   pnpm screenshot <name> --run <folder>   screenshots/<folder>/<name>.png
//
// The "device" is a Chromium started by `pnpm shots --start-browser`, which
// keeps running between commands and is reached over its remote-debugging
// port. This script opens no page and clicks nothing: put the browser in the
// state you want first (docs/guides/DEVICE_TESTING.md), then capture it.
//
// The capture is taken at once, without waiting for the page to settle. The
// image comes back from Playwright as a buffer and is written from here, so
// nothing binary passes through a shell. The other half of this pair is
// scripts/shots.mjs, which imports the helpers below.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

export const CDP_URL = process.env.SHOTS_CDP_URL ?? 'http://127.0.0.1:9222';
export const SHOTS_DIR = fileURLToPath(
  new URL('../screenshots', import.meta.url)
);

/** A file-safe name: lower case, with anything unusual turned into a dash. */
export const sanitise = (name) =>
  String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._@-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80);

/** The attached browser's version string, or null when none is listening. */
export async function browserVersion() {
  try {
    const res = await fetch(`${CDP_URL}/json/version`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok ? ((await res.json()).Browser ?? 'unknown') : null;
  } catch {
    return null;
  }
}

/**
 * Connect to the running browser. `browser.close()` on the result only
 * disconnects: the browser, its tab and its session stay as they were.
 */
export async function attach() {
  const browser = await chromium.connectOverCDP(CDP_URL);
  const context = browser.contexts()[0];
  if (!context) throw new Error('The browser has no default profile open.');
  let page = null;
  for (const candidate of context.pages()) {
    const visible = await candidate
      .evaluate(() => document.visibilityState === 'visible')
      .catch(() => false);
    if (visible) {
      page = candidate;
      break;
    }
  }
  page ??= context.pages()[0] ?? (await context.newPage());
  return { browser, context, page };
}

/** A PNG of the page's viewport, in memory, with CSS animations frozen. */
export const captureBuffer = (page) =>
  page.screenshot({ animations: 'disabled' });

/**
 * Write a PNG of the page's viewport; a failed capture leaves no file. Pass
 * `buffer` to save a capture already taken with captureBuffer.
 */
export async function capture(page, file, buffer) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  try {
    fs.writeFileSync(file, buffer ?? (await captureBuffer(page)));
  } catch (err) {
    fs.rmSync(file, { force: true });
    throw err;
  }
}

const USAGE = `Usage: pnpm screenshot <name> [--run <folder>]

Saves one PNG of what the shots browser shows now, as
screenshots/manual/<name>.png, or screenshots/<folder>/<name>.png with --run.
Start the browser first: pnpm shots --start-browser`;

async function main() {
  const args = process.argv.slice(2);
  let folder = 'manual';
  const names = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--run') folder = sanitise(args[++i] ?? '');
    else if (args[i] === '--help' || args[i] === '-h') names.length = 0;
    else names.push(args[i]);
  }
  const name = sanitise(names[0] ?? '');
  if (!name || !folder || names.length !== 1) {
    console.log(USAGE);
    return 0;
  }
  if (!(await browserVersion())) {
    console.error(
      `No browser attached at ${CDP_URL}. Start one: pnpm shots --start-browser`
    );
    return 1;
  }

  const file = path.join(SHOTS_DIR, folder, `${name}.png`);
  const { browser, page } = await attach();
  try {
    await capture(page, file);
  } catch (err) {
    console.error(`Capture failed: ${err.message}`);
    return 1;
  } finally {
    await browser.close().catch(() => {});
  }
  console.log(file);
  return 0;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.exitCode = await main();
}
