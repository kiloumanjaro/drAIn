// Screenshot pages and states in the shots browser, and say which changed.
//
//   pnpm shots --start-browser [--viewport laptop] [--headed]
//   pnpm shots --preflight
//   pnpm shots [options] --group <name> [--states]
//   pnpm shots [options] <name>=<path> ...
//   pnpm shots --accept <run> [<name> ...]
//   pnpm shots --stop-browser
//
// The "device" is Playwright's Chromium, started once with a remote-debugging
// port and its own profile, so a sign-in done in it survives between runs.
// The app is whatever answers at --base-url (default http://localhost:3056, a
// production build: docs/guides/DEVICE_TESTING.md says why and how).
//
// Pages and states are named in scripts/shots.manifest.json. Each run gets a
// folder under screenshots/ holding the PNGs, results.json and an index.html
// contact sheet; each image is compared with screenshots/baseline/, which
// only --accept changes.
//
// This script never signs in and never reads or prints a password, token or
// key. The one-capture half of the pair is scripts/screenshot.mjs; /pages and
// /shots (.claude/commands) drive both.
import { execFileSync, spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import {
  CDP_URL,
  SHOTS_DIR,
  attach,
  browserVersion,
  capture,
  captureBuffer,
  sanitise,
} from './screenshot.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MANIFEST = path.join(ROOT, 'scripts', 'shots.manifest.json');
const BASELINE_DIR = path.join(SHOTS_DIR, 'baseline');
const BUILD_STAMP = path.join(ROOT, '.next', 'shots-build.json');
// Under node_modules so git, ESLint, Prettier and tsc all leave it alone. It
// holds the browser's cookies, which is where a signed-in session lives.
const PROFILE_DIR = path.join(
  ROOT,
  'node_modules',
  '.cache',
  'shots-browser-profile'
);
const DEFAULT_BASE_URL = 'http://localhost:3056';
const DEFAULT_PROBE = '/map?activetab=profile';
// Any page fetches the signed-in user's profile; this one is quick to load.
const ROLE_PROBE = '/login';
const VIEWPORTS = {
  phone: [390, 844],
  tablet: [768, 1024],
  laptop: [1366, 768],
  desktop: [1920, 1080],
};
// Lowest to highest: a page that needs staff is also of use to an admin.
const ROLES = ['guest', 'citizen', 'staff', 'admin'];
const POLL_MS = 300;
const QUIET_MS = 500;
const STILL_MS = 1000;
const STEP_TIMEOUT_MS = 10000;
const TEXT_LIMIT = 5000;
// A pixel differs when a colour channel is off by more than this (of 255);
// a page changed when more than DEFAULT_TOLERANCE of its pixels differ.
// Measured here 2026-10-10 on 29 captures re-shot with no code change: 28
// differed by no pixel at all, one map page by 0.003%.
const CHANNEL_DELTA = 24;
const DEFAULT_TOLERANCE = 0.001;
// Soft areas (see regionsOf): the grid's cell size and how far a pixel may
// have moved, both in pixels.
const SOFT_CELL = 4;
const SOFT_RADIUS = 2;
// What counts as the app's own source when asking "is this build stale?".
const APP_SOURCE = [
  '.',
  ':!docs',
  ':!scripts',
  ':!e2e',
  ':!supabase',
  ':!*.md',
];

const USAGE = `Usage:
  pnpm shots --start-browser [--viewport <size>] [--headed]
  pnpm shots --preflight [--base-url <url>] [--probe <path>]
  pnpm shots [options] --group <name> [--states]
  pnpm shots [options] <name>=<path> ...
  pnpm shots --accept <run> [<name> ...]
  pnpm shots --stamp-build
  pnpm shots --stop-browser

Device:
  --start-browser     Start Chromium in the background and wait for it.
  --viewport <size>   ${Object.keys(VIEWPORTS).join(', ')} or WIDTHxHEIGHT (default laptop).
  --headed            Show the window, e.g. to sign in by hand.
  --stop-browser      Close it. The profile, and any session in it, is kept.

Checks:
  --preflight         Print one table (browser, app, build age, backend,
                      settings, session) and open no page from the list.
  --probe <path>      Page whose text the preflight prints
                      (default ${DEFAULT_PROBE}).
  --stamp-build       Record which source the build in .next was made from.
                      pnpm shots:build builds and stamps in one go.

What to shoot:
  --group <name>      Every page of that group in scripts/shots.manifest.json;
                      "all" for every group. May be repeated.
  --states            With --group: also the group's scripted states.
  <name>=<path>       One page, e.g. docs=/docs. The leading slash may be left
                      off (docs=docs), which Git Bash needs.
  --pages <file>      JSON array of {"name", "path"}: no shell quoting at all.

Batch:
  --base-url <url>    Where the app is served (default ${DEFAULT_BASE_URL},
                      or SHOTS_BASE_URL).
  --run <folder>      Add to screenshots/<folder> instead of a new dated one.
  --as <role>         Who is signed in: ${ROLES.join(', ')}. Checked against
                      the browser before the first page.
  --clear             Clear the app's cookies and storage once, before the
                      first page. This signs the browser out.
  --scroll            Also capture after one wheel-scroll, if anything moved.
  --font-scale <n>    Scale the browser's default font size for this run.
  --timeout <sec>     Longest wait for a page to settle (default 30).
  --allow-hosted      Run even though the app's Supabase is not local.

Baseline:
  --accept <run>      Make that run's images the baseline later runs are
                      compared with; name pages to accept only those.`;

class UsageError extends Error {}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Keys and tokens turn up in URLs inside console messages; never keep one. */
const redact = (value) =>
  String(value)
    .replace(/(?:[ps]k\.)?eyJ[\w-]+(?:\.[\w-]+)+/g, '<redacted>')
    .replace(
      /\b(apikey|access_token|refresh_token|token|key|password|secret)=[^&\s'"]+/gi,
      '$1=<redacted>'
    );

function parseViewport(value) {
  const preset = VIEWPORTS[value];
  if (preset) return preset;
  const match = /^(\d{3,4})x(\d{3,4})$/.exec(value);
  if (!match) throw new UsageError(`Unknown viewport "${value}".`);
  return [Number(match[1]), Number(match[2])];
}

/** "/docs", "docs" and "" all mean a path under the base URL. */
function normalisePath(raw) {
  if (/^[A-Za-z]:[\\/]/.test(raw)) {
    throw new UsageError(
      `"${raw}" is a Windows path: the shell rewrote a leading slash. ` +
        'Leave the slash off (docs=docs, home=) or use --pages <file.json>.'
    );
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
    throw new UsageError(
      `"${raw}": give a path; the origin comes from --base-url.`
    );
  }
  return `/${raw.replace(/^[./]+/, '')}`;
}

function pageSpec(item) {
  const name = sanitise(item.name ?? '');
  if (!name) throw new UsageError(`"${item.name}" is not a usable page name.`);
  return { ...item, name, path: normalisePath(String(item.path ?? '')) };
}

function parseArgs(argv) {
  const opts = {
    mode: 'run',
    pages: [],
    groups: [],
    states: false,
    accept: null,
    acceptNames: [],
    baseUrl: process.env.SHOTS_BASE_URL ?? DEFAULT_BASE_URL,
    probe: DEFAULT_PROBE,
    viewport: 'laptop',
    headed: false,
    clear: false,
    scroll: false,
    allowHosted: false,
    fontScale: 1,
    timeout: 30,
    run: null,
    as: null,
  };
  const loose = [];
  const take = (i, flag) => {
    const next = argv[i];
    if (next === undefined || next.startsWith('--')) {
      throw new UsageError(`${flag} needs a value.`);
    }
    return next;
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') opts.mode = 'help';
    else if (arg === '--preflight') opts.mode = 'preflight';
    else if (arg === '--start-browser') opts.mode = 'start';
    else if (arg === '--stop-browser') opts.mode = 'stop';
    else if (arg === '--stamp-build') opts.mode = 'stamp';
    else if (arg === '--accept') {
      opts.mode = 'accept';
      opts.accept = sanitise(take(++i, arg));
    } else if (arg === '--headed') opts.headed = true;
    else if (arg === '--clear') opts.clear = true;
    else if (arg === '--scroll') opts.scroll = true;
    else if (arg === '--states') opts.states = true;
    else if (arg === '--allow-hosted') opts.allowHosted = true;
    else if (arg === '--viewport') opts.viewport = take(++i, arg);
    else if (arg === '--base-url') opts.baseUrl = take(++i, arg);
    else if (arg === '--probe') opts.probe = normalisePath(take(++i, arg));
    else if (arg === '--run') opts.run = sanitise(take(++i, arg));
    else if (arg === '--as') opts.as = sanitise(take(++i, arg));
    else if (arg === '--group') opts.groups.push(...take(++i, arg).split(','));
    else if (arg === '--timeout') opts.timeout = Number(take(++i, arg));
    else if (arg === '--font-scale') opts.fontScale = Number(take(++i, arg));
    else if (arg === '--pages') {
      const file = take(++i, arg);
      const list = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!Array.isArray(list)) {
        throw new UsageError(`${file} must hold a JSON array.`);
      }
      opts.pages.push(...list.map(pageSpec));
    } else if (arg.startsWith('--')) {
      throw new UsageError(`Unknown option ${arg}.`);
    } else {
      loose.push(arg);
    }
  }
  for (const arg of loose) {
    if (opts.mode === 'accept') {
      opts.acceptNames.push(sanitise(arg));
      continue;
    }
    const eq = arg.indexOf('=');
    if (eq < 1) throw new UsageError(`"${arg}" is not a <name>=<path> pair.`);
    opts.pages.push(
      pageSpec({ name: arg.slice(0, eq), path: arg.slice(eq + 1) })
    );
  }
  if (!(opts.timeout > 0)) throw new UsageError('--timeout must be positive.');
  if (!(opts.fontScale >= 0.5 && opts.fontScale <= 4)) {
    throw new UsageError('--font-scale must be between 0.5 and 4.');
  }
  if (opts.states && opts.groups.length === 0) {
    throw new UsageError('--states needs --group.');
  }
  try {
    opts.base = new URL(opts.baseUrl);
  } catch {
    throw new UsageError(`"${opts.baseUrl}" is not a URL.`);
  }
  return opts;
}

function printTable(headers, rows) {
  const cells = [headers, ...rows].map((row) => row.map((c) => String(c)));
  const widths = headers.map((_, col) =>
    Math.max(...cells.map((row) => row[col].length))
  );
  const line = (row) =>
    row
      .map((cell, col) => cell.padEnd(widths[col]))
      .join('  ')
      .trimEnd();
  console.log(line(cells[0]));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const row of cells.slice(1)) console.log(line(row));
}

/** The HTTP status a URL answers with, or null when nothing answers. */
async function httpStatus(url, timeoutMs = 15000) {
  try {
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.status;
  } catch {
    return null;
  }
}

const isLocal = (url) => ['127.0.0.1', 'localhost'].includes(url.hostname);

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

// ---------------------------------------------------------------- device

/**
 * Playwright's headless-shell build of the same Chromium, or null. It is what
 * the e2e specs run in, and the only one whose --window-size is the page
 * size: full Chromium run headless takes its window frame out of it (1366x768
 * gave a 1348x616 page here) and will not go narrower than about 480.
 */
function headlessShell() {
  const full = chromium.executablePath();
  const revisionDir = path.dirname(path.dirname(full));
  const shellDir = path.join(
    path.dirname(revisionDir),
    path.basename(revisionDir).replace(/^chromium-/, 'chromium_headless_shell-')
  );
  if (shellDir === revisionDir || !fs.existsSync(shellDir)) return null;
  for (const dir of fs.readdirSync(shellDir, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    const exe = fs
      .readdirSync(path.join(shellDir, dir.name))
      .find((name) => /^chrome-headless-shell(\.exe)?$/.test(name));
    if (exe) return path.join(shellDir, dir.name, exe);
  }
  return null;
}

async function startBrowser(opts) {
  const running = await browserVersion();
  if (running) {
    console.log(`Already running at ${CDP_URL} (${running}).`);
    console.log('To change size or show the window: --stop-browser first.');
    return 0;
  }
  const [width, height] = parseViewport(opts.viewport);
  const shell = opts.headed ? null : headlessShell();
  if (!opts.headed && !shell && !process.env.SHOTS_BROWSER) {
    console.error(
      'No headless-shell build next to Chromium: the page will be smaller ' +
        'than asked for. Install it: pnpm exec playwright install chromium'
    );
  }
  const exe = process.env.SHOTS_BROWSER ?? shell ?? chromium.executablePath();
  if (!fs.existsSync(exe)) {
    console.error(`No Chromium at ${exe}.`);
    console.error('Install it: pnpm exec playwright install chromium');
    return 1;
  }
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  // Spawned directly, never through a shell. --hide-scrollbars is what
  // Playwright's own headless runs use, so widths match the e2e specs.
  const args = [
    `--remote-debugging-port=${new URL(CDP_URL).port || '9222'}`,
    `--user-data-dir=${PROFILE_DIR}`,
    `--window-size=${width},${height}`,
    '--force-device-scale-factor=1',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    ...(opts.headed || exe === shell ? [] : ['--headless=new']),
    'about:blank',
  ];
  spawn(exe, args, { detached: true, stdio: 'ignore' }).unref();

  for (let waited = 0; waited < 20000; waited += 250) {
    await delay(250);
    const version = await browserVersion();
    if (version) {
      console.log(`Started ${version} at ${CDP_URL}.`);
      console.log(
        `Asked for ${width}x${height}${opts.headed ? ', headed' : ''}; ` +
          '--preflight prints the size the page really gets.'
      );
      return 0;
    }
  }
  console.error(`The browser did not answer at ${CDP_URL} within 20 s.`);
  return 1;
}

async function stopBrowser() {
  if (!(await browserVersion())) {
    console.log(`No browser at ${CDP_URL}.`);
    return 0;
  }
  const browser = await chromium.connectOverCDP(CDP_URL);
  const session = await browser.newBrowserCDPSession();
  // The connection drops as the browser exits, so the reply may never come.
  await session.send('Browser.close').catch(() => {});
  await browser.close().catch(() => {});
  // Not done until the port is free: a start straight after would otherwise
  // find the dying browser and report it as already running.
  for (let waited = 0; (await browserVersion()) && waited < 10000; ) {
    await delay(200);
    waited += 200;
  }
  console.log('Browser closed. Its profile, and any session in it, is kept.');
  return 0;
}

const viewportOf = (page) =>
  page.evaluate(() => `${window.innerWidth}x${window.innerHeight}`);

// ---------------------------------------------------------------- settle

const readText = (page) =>
  page
    .evaluate(() =>
      (document.body?.innerText ?? '').replace(/\s+/g, ' ').trim()
    )
    // Thrown while a navigation replaces the document: not settled yet.
    .catch(() => '');

/**
 * Watches a page's requests: how long none has been in flight, which hosts
 * other than this machine it called, and which requests failed.
 */
function watchNetwork(page) {
  const pending = new Set();
  const hosts = new Set();
  const failed = [];
  let quietSince = Date.now();
  const bare = (request) => {
    try {
      const url = new URL(request.url());
      return ['http:', 'https:'].includes(url.protocol) ? url : null;
    } catch {
      return null;
    }
  };
  const onRequest = (request) => {
    const url = bare(request);
    if (!url) return;
    pending.add(request);
    if (!isLocal(url)) hosts.add(url.host);
  };
  const done = (request) => {
    if (pending.delete(request) && pending.size === 0) quietSince = Date.now();
  };
  const onFailed = (request) => {
    const url = bare(request);
    // Without the query string, which is where keys and tokens ride.
    if (url && failed.length < 5) failed.push(url.origin + url.pathname);
    done(request);
  };
  // Requests the page before this one left behind never report an ending
  // when their frame goes (seen with the docs page's embedded video, which
  // held the next page up for the full timeout), so start again from zero.
  const onNavigated = (frame) => {
    if (frame !== page.mainFrame()) return;
    pending.clear();
    quietSince = Date.now();
  };
  page.on('request', onRequest);
  page.on('requestfinished', done);
  page.on('requestfailed', onFailed);
  page.on('framenavigated', onNavigated);
  return {
    quietFor: () => (pending.size === 0 ? Date.now() - quietSince : 0),
    hosts: () => [...hosts].sort(),
    failed: () => failed,
    stop() {
      page.off('request', onRequest);
      page.off('requestfinished', done);
      page.off('requestfailed', onFailed);
      page.off('framenavigated', onNavigated);
    },
  };
}

/**
 * Wait until the page has come to rest, then hand back its text and a
 * capture. At rest means all three at once: the text is non-empty and the
 * same on two polls in a row, no request has been in flight for half a
 * second, and every capture over a full second is identical. Text alone is
 * not enough: the map page's text holds still on "Loading Map..." while it
 * loads. Two matching captures 300 ms apart were not enough either: the map
 * stops drawing for longer than that while it reads a large overlay, and one
 * capture in 36 here caught it without its flood areas.
 */
async function settle(page, network, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastText = '';
  let lastShot = null;
  let stillSince = 0;
  let waitingOn = 'text';
  while (Date.now() < deadline) {
    await delay(POLL_MS);
    const text = await readText(page);
    if (!text || text !== lastText) {
      waitingOn = 'text';
      lastShot = null;
    } else if (network.quietFor() < QUIET_MS) {
      waitingOn = 'network';
      lastShot = null;
    } else {
      const shot = await captureBuffer(page);
      if (!lastShot?.equals(shot)) stillSince = Date.now();
      else if (Date.now() - stillSince >= STILL_MS) {
        return { text, shot, settled: true };
      }
      waitingOn = 'pixels';
      lastShot = shot;
    }
    lastText = text;
  }
  return {
    text: lastText,
    shot: lastShot ?? (await captureBuffer(page)),
    settled: false,
    waitingOn,
  };
}

/** One wheel-scroll at the centre of the page; true if anything scrolled. */
async function scrollOnce(page) {
  const size = await page.evaluate(() => {
    window.__shotsScrolled = false;
    document.addEventListener(
      'scroll',
      () => {
        window.__shotsScrolled = true;
      },
      { capture: true, once: true }
    );
    return { width: window.innerWidth, height: window.innerHeight };
  });
  await page.mouse.move(size.width / 2, size.height / 2);
  await page.mouse.wheel(0, Math.round(size.height * 0.8));
  for (let waited = 0; waited < 1200; waited += 200) {
    await delay(200);
    if (await page.evaluate(() => window.__shotsScrolled === true)) return true;
  }
  return false;
}

// ---------------------------------------------------------------- states

/** A step's target: by role and name, label, text, or a CSS selector. */
function locate(page, target) {
  if (target?.role) {
    return page.getByRole(target.role, {
      name: target.name,
      exact: target.exact ?? true,
    });
  }
  if (target?.label) return page.getByLabel(target.label);
  if (target?.text) {
    return page.getByText(target.text, { exact: target.exact ?? false });
  }
  if (target?.selector) return page.locator(target.selector);
  throw new Error('a step needs role, label, text or selector');
}

/** Run a state's steps in order; throws naming the step that failed. */
async function runSteps(page, steps) {
  for (const [index, step] of steps.entries()) {
    const timeout = STEP_TIMEOUT_MS;
    try {
      if (step.click) await locate(page, step.click).click({ timeout });
      else if (step.hover) await locate(page, step.hover).hover({ timeout });
      else if (step.fill) {
        await locate(page, step.fill).fill(String(step.value ?? ''), {
          timeout,
        });
      } else if (step.press) await page.keyboard.press(step.press);
      else if (step.waitFor) {
        await locate(page, step.waitFor).first().waitFor({ timeout });
      } else throw new Error('unknown step');
    } catch (err) {
      const what = JSON.stringify(step);
      throw new Error(
        `step ${index + 1} ${what}: ${err.message.split('\n')[0]}`
      );
    }
  }
}

// --------------------------------------------------------------- compare

/**
 * Which parts of the screen a comparison should treat differently, measured
 * on the live page:
 * - `ignore`: rectangles left out altogether. From `ignore` selectors, and
 *   from `ignoreText` patterns (the element holding matching text, such as a
 *   clock time).
 * - `soft`: a grid marking where an element matching a `soft` selector is
 *   the topmost thing on screen. The map canvas runs under the whole page,
 *   so its rectangle would cover the panels too; the grid is only the map
 *   that can be seen.
 */
const regionsOf = (page, target) =>
  page.evaluate(
    ({ ignore, ignoreText, soft, cell }) => {
      const rect = (el) => {
        const box = el.getBoundingClientRect();
        return {
          x: Math.floor(box.x),
          y: Math.floor(box.y),
          width: Math.ceil(box.width),
          height: Math.ceil(box.height),
        };
      };
      const rects = ignore.flatMap((selector) =>
        [...document.querySelectorAll(selector)].map(rect)
      );
      if (ignoreText.length) {
        const patterns = ignoreText.map((source) => new RegExp(source));
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT
        );
        for (let node; (node = walker.nextNode()); ) {
          const text = node.nodeValue.trim();
          if (
            text &&
            node.parentElement &&
            patterns.some((p) => p.test(text))
          ) {
            rects.push(rect(node.parentElement));
          }
        }
      }
      let grid = null;
      if (soft.some((selector) => document.querySelector(selector))) {
        const cols = Math.ceil(window.innerWidth / cell);
        const rows = Math.ceil(window.innerHeight / cell);
        let bits = '';
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const el = document.elementFromPoint(
              col * cell + cell / 2,
              row * cell + cell / 2
            );
            bits += el && soft.some((selector) => el.closest(selector)) ? 1 : 0;
          }
        }
        grid = { cols, cell, bits };
      }
      return { ignore: rects, soft: grid };
    },
    {
      ignore: target.ignore ?? [],
      ignoreText: target.ignoreText ?? [],
      soft: target.soft ?? [],
      cell: SOFT_CELL,
    }
  );

/**
 * Compare a capture with its baseline image, pixel by pixel, skipping the
 * ignored rectangles. In soft areas a pixel only counts as different when
 * nothing within SOFT_RADIUS of it in the baseline matches: the map is drawn
 * a fraction of a pixel off from one load to the next, which moves every
 * edge on it without anything having changed. Writes a diff image (the
 * capture greyed out, differing pixels red) when asked and anything differs.
 */
async function compareImages(
  file,
  baseline,
  { ignore = [], soft = null, diffFile } = {}
) {
  if (sha256(fs.readFileSync(file)) === sha256(fs.readFileSync(baseline))) {
    return { ratio: 0 };
  }
  const { default: sharp } = await import('sharp');
  const raw = (source) =>
    sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [now, before] = await Promise.all([raw(file), raw(baseline)]);
  const { width, height } = now.info;
  if (width !== before.info.width || height !== before.info.height) {
    return { ratio: 1, sizeChanged: true };
  }

  const skip = new Uint8Array(width * height);
  for (const rect of ignore) {
    const right = Math.min(width, rect.x + rect.width);
    const bottom = Math.min(height, rect.y + rect.height);
    for (let y = Math.max(0, rect.y); y < bottom; y++) {
      skip.fill(1, y * width + Math.max(0, rect.x), y * width + right);
    }
  }
  const a = now.data;
  const b = before.data;
  const differs = (i, j) =>
    Math.abs(a[i] - b[j]) > CHANNEL_DELTA ||
    Math.abs(a[i + 1] - b[j + 1]) > CHANNEL_DELTA ||
    Math.abs(a[i + 2] - b[j + 2]) > CHANNEL_DELTA;
  const isSoft = (x, y) =>
    soft?.bits[
      Math.floor(y / soft.cell) * soft.cols + Math.floor(x / soft.cell)
    ] === '1';
  const matchesNearby = (i, x, y) => {
    for (let dy = -SOFT_RADIUS; dy <= SOFT_RADIUS; dy++) {
      for (let dx = -SOFT_RADIUS; dx <= SOFT_RADIUS; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (!differs(i, (ny * width + nx) * 4)) return true;
      }
    }
    return false;
  };
  const diff = Buffer.alloc(a.length);
  let compared = 0;
  let differing = 0;
  for (let p = 0, i = 0; p < skip.length; p++, i += 4) {
    const grey = 200 + ((a[i] + a[i + 1] + a[i + 2]) / 3) * 0.2;
    diff[i] = diff[i + 1] = diff[i + 2] = grey;
    diff[i + 3] = 255;
    if (skip[p]) continue;
    compared++;
    if (!differs(i, i)) continue;
    const x = p % width;
    const y = (p - x) / width;
    if (!(isSoft(x, y) && matchesNearby(i, x, y))) {
      differing++;
      diff[i] = 255;
      diff[i + 1] = diff[i + 2] = 0;
    }
  }
  if (differing && diffFile) {
    await sharp(diff, { raw: { width, height, channels: 4 } })
      .png()
      .toFile(diffFile);
  }
  return { ratio: compared ? differing / compared : 0 };
}

/** Baselines are per viewport and font scale: other sizes are other pages. */
const baselineDir = (viewport, fontScale) =>
  path.join(
    BASELINE_DIR,
    fontScale === 1 ? viewport : `${viewport}_fs${fontScale}`
  );

/** Set `changed`, `diffRatio` and `diffImage` on an entry for one image. */
async function judge(entry, image, ctx, regions) {
  const file = path.join(ctx.runDir, image);
  const baseline = path.join(ctx.baselineDir, image);
  if (!fs.existsSync(baseline)) return 'new';
  const diffFile = file.replace(/\.png$/, '--diff.png');
  fs.rmSync(diffFile, { force: true });
  const { ratio, sizeChanged } = await compareImages(file, baseline, {
    ...regions,
    diffFile,
  });
  const changed = ratio > (entry.tolerance ?? DEFAULT_TOLERANCE);
  if (!changed) fs.rmSync(diffFile, { force: true });
  entry.diffRatio = Math.max(entry.diffRatio ?? 0, Number(ratio.toFixed(5)));
  if (changed && !sizeChanged) entry.diffImage ??= path.basename(diffFile);
  return changed ? 'changed' : 'unchanged';
}

function acceptRun(opts) {
  const runDir = path.join(SHOTS_DIR, opts.accept);
  const results = readJson(path.join(runDir, 'results.json'));
  if (!results) {
    console.error(`No results.json in screenshots/${opts.accept}.`);
    return 1;
  }
  const target = baselineDir(results.viewport, results.fontScale ?? 1);
  fs.mkdirSync(target, { recursive: true });
  const wanted = new Set(opts.acceptNames);
  let copied = 0;
  for (const page of results.pages) {
    if (wanted.size && !wanted.has(page.page)) continue;
    wanted.delete(page.page);
    for (const image of [page.image, page.scrollImage].filter(Boolean)) {
      fs.copyFileSync(path.join(runDir, image), path.join(target, image));
      copied++;
    }
  }
  if (wanted.size) {
    console.error(`Not in that run: ${[...wanted].join(', ')}`);
    return 1;
  }
  console.log(`${copied} images are now the baseline in ${target}`);
  return 0;
}

// ----------------------------------------------------------------- shoot

async function shoot(page, target, ctx) {
  const url = new URL(target.path, ctx.base);
  const entry = {
    page: target.name,
    kind: target.steps ? 'state' : 'page',
    group: target.group ?? null,
    path: target.path,
    as: ctx.as,
    status: 'ok',
    httpStatus: null,
    finalPath: null,
    waitedSeconds: 0,
    settled: false,
    image: null,
    scrollImage: null,
    diffImage: null,
    sameAs: null,
    changed: null,
    diffRatio: null,
    tolerance: target.tolerance ?? null,
    text: '',
    textHash: null,
    externalHosts: [],
    failedRequests: [],
    pageErrors: [],
    consoleErrors: [],
    error: null,
  };
  let crashed = false;
  const onPageError = (err) => entry.pageErrors.push(redact(err.message));
  const onConsole = (msg) => {
    if (msg.type() === 'error') entry.consoleErrors.push(redact(msg.text()));
  };
  const onCrash = () => {
    crashed = true;
  };
  page.on('pageerror', onPageError);
  page.on('console', onConsole);
  page.on('crash', onCrash);
  const network = watchNetwork(page);

  const started = Date.now();
  try {
    const response = await page.goto(url.href, {
      waitUntil: 'domcontentloaded',
      timeout: ctx.timeoutMs,
    });
    entry.httpStatus = response?.status() ?? null;
    let rest = await settle(page, network, ctx.timeoutMs);
    if (target.steps) {
      try {
        await runSteps(page, target.steps);
      } catch (err) {
        entry.status = 'state-error';
        entry.error = redact(err.message);
      }
      rest = await settle(page, network, ctx.timeoutMs);
    }
    const { text, shot, settled } = rest;
    entry.settled = settled;
    entry.text = redact(text.slice(0, TEXT_LIMIT));
    entry.textHash = text ? sha256(text) : null;

    if (crashed) throw new Error('The page crashed.');
    const final = new URL(page.url());
    entry.finalPath = final.pathname + final.search;
    if (entry.status === 'ok') {
      if (final.origin !== ctx.base.origin) entry.status = 'left-app';
      else if (!text) entry.status = 'blank';
      else if (final.pathname !== url.pathname) entry.status = 'redirected';
    }
    if (!settled) {
      entry.error ??= `Still waiting on ${rest.waitingOn} after ${ctx.timeoutMs / 1000} s.`;
    }

    // The same text as an earlier page means the same screen, which is how a
    // redirect or a default tab shows: keep one image, point at it. Not for
    // states (a hover changes no text) or anything caught still moving.
    const twin =
      entry.kind === 'page' &&
      settled &&
      ctx.entries.find(
        (e) => e.image && e.kind === 'page' && e.textHash === entry.textHash
      );
    if (twin) {
      entry.sameAs = twin.page;
      entry.changed = twin.changed;
    } else {
      const regions = await regionsOf(page, target);
      entry.image = `${target.name}.png`;
      await capture(page, path.join(ctx.runDir, entry.image), shot);
      entry.changed = await judge(entry, entry.image, ctx, regions);

      if (ctx.scroll && entry.kind === 'page' && (await scrollOnce(page))) {
        const scrolled = await settle(page, network, ctx.timeoutMs);
        entry.scrollImage = `${target.name}--scrolled.png`;
        await capture(
          page,
          path.join(ctx.runDir, entry.scrollImage),
          scrolled.shot
        );
        const below = await judge(
          entry,
          entry.scrollImage,
          ctx,
          await regionsOf(page, target)
        );
        if (below === 'changed' && entry.changed === 'unchanged') {
          entry.changed = 'changed';
        }
      }
    }
  } catch (err) {
    entry.status = crashed ? 'crashed' : 'error';
    entry.error = redact(err.message.split('\n')[0]);
  } finally {
    entry.waitedSeconds = Number(((Date.now() - started) / 1000).toFixed(1));
    entry.externalHosts = network.hosts();
    entry.failedRequests = network.failed();
    network.stop();
    page.off('pageerror', onPageError);
    page.off('console', onConsole);
    page.off('crash', onCrash);
  }
  entry.pageErrors = entry.pageErrors.slice(0, 5);
  entry.consoleErrors = entry.consoleErrors.slice(0, 5);
  return entry;
}

// -------------------------------------------------------------- manifest

const roleRank = (role) => ROLES.indexOf(role);

/**
 * The manifest's pages (and states) for the asked groups, plus what was left
 * out and why. Shot signed in, a name gains "@role" so each role keeps its
 * own baseline.
 */
function fromManifest(opts, viewport) {
  const targets = [];
  const skipped = [];
  if (opts.groups.length === 0) return { targets, skipped };
  const manifest = readJson(MANIFEST);
  if (!manifest) throw new Error(`Cannot read ${MANIFEST}.`);
  const pages = manifest.pages ?? [];
  const states = manifest.states ?? [];
  const groups = [...new Set([...pages, ...states].map((e) => e.group))];
  const unknown = opts.groups.filter((g) => g !== 'all' && !groups.includes(g));
  if (unknown.length) {
    throw new Error(
      `No group "${unknown.join('", "')}" in the manifest. Groups: ${groups.join(', ')}, all.`
    );
  }
  const sizeNames = Object.entries(VIEWPORTS)
    .filter(([, size]) => size.join('x') === viewport)
    .map(([name]) => name);
  const suffix = roleRank(opts.as) > 0 ? `@${opts.as}` : '';

  for (const entry of [...pages, ...(opts.states ? states : [])]) {
    if (!opts.groups.includes('all') && !opts.groups.includes(entry.group)) {
      continue;
    }
    const skip = (reason) => skipped.push({ page: entry.name, reason });
    if (entry.param) skip(`needs seed data: ${entry.param}`);
    else if (entry.mutates) skip('changes data; not run');
    else if (
      entry.viewports &&
      !entry.viewports.some((v) => v === viewport || sizeNames.includes(v))
    ) {
      skip(`only at ${entry.viewports.join(', ')}`);
    } else if (
      entry.needs &&
      roleRank(opts.as) >= 0 &&
      roleRank(opts.as) < roleRank(entry.needs)
    ) {
      skip(`gated: needs ${entry.needs}`);
    } else {
      targets.push(
        pageSpec({
          ...manifest.defaults,
          ...entry,
          name: entry.name + suffix,
        })
      );
    }
  }
  return { targets, skipped };
}

// ---------------------------------------------------------------- guards

/** Only these names are read from .env.local; keys and tokens as yes/no. */
function readSettings() {
  const file = path.join(ROOT, '.env.local');
  const settings = {
    present: fs.existsSync(file),
    changedAt: null,
    supabaseUrl: null,
    backendUrl: null,
    anonKey: false,
    mapboxToken: false,
  };
  if (!settings.present) return settings;
  settings.changedAt = fs.statSync(file).mtimeMs;
  const urlOf = (value) => {
    try {
      return new URL(value);
    } catch {
      return null;
    }
  };
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue;
    const value = match[2].replace(/^["']|["']$/g, '');
    if (match[1] === 'NEXT_PUBLIC_SUPABASE_URL') {
      settings.supabaseUrl = urlOf(value);
    } else if (match[1] === 'NEXT_PUBLIC_BACKEND_URL') {
      settings.backendUrl = urlOf(value);
    } else if (match[1] === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
      settings.anonKey = value.length > 0;
    } else if (match[1] === 'NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN') {
      settings.mapboxToken = value.length > 0;
    }
  }
  return settings;
}

/** The commit and a fingerprint of uncommitted app-source changes. */
function sourceState() {
  const git = (...args) =>
    execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  try {
    const status = git('status', '--porcelain', '--', ...APP_SOURCE);
    // A diff does not cover files git has never seen; size and time do.
    const untracked = status
      .split('\n')
      .filter((line) => line.startsWith('??'))
      .map((line) => {
        const name = line.slice(3).replace(/^"|"$/g, '');
        try {
          const stat = fs.statSync(path.join(ROOT, name));
          return `${name}:${stat.size}:${stat.mtimeMs}`;
        } catch {
          return name;
        }
      });
    return {
      commit: git('rev-parse', 'HEAD').trim(),
      dirty: status.trim().length > 0,
      fingerprint: sha256(
        status + git('diff', 'HEAD', '--', ...APP_SOURCE) + untracked.join()
      ),
    };
  } catch {
    return null;
  }
}

const buildId = () => {
  try {
    return fs.readFileSync(path.join(ROOT, '.next', 'BUILD_ID'), 'utf8').trim();
  } catch {
    return null;
  }
};

/** NEXT_PUBLIC_ values are fixed at build time, so the stamp keeps them. */
function stampBuild() {
  const id = buildId();
  const source = sourceState();
  if (!id || !source) {
    console.error(
      id ? 'git did not answer.' : 'No build in .next: pnpm build first.'
    );
    return 1;
  }
  const settings = readSettings();
  fs.writeFileSync(
    BUILD_STAMP,
    `${JSON.stringify(
      {
        buildId: id,
        stampedAt: new Date().toISOString(),
        ...source,
        supabaseOrigin: settings.supabaseUrl?.origin ?? null,
        backendOrigin: settings.backendUrl?.origin ?? null,
      },
      null,
      2
    )}\n`
  );
  console.log(
    `Stamped build ${id}: commit ${source.commit.slice(0, 7)}` +
      (source.dirty ? ' plus uncommitted changes.' : '.')
  );
  return 0;
}

/**
 * What the app answering at `base` was built from, and whether the source
 * has moved since: { served, stamp, state: current|stale|unknown, detail }.
 */
async function buildState(base) {
  const id = buildId();
  const manifest = id && new URL(`/_next/static/${id}/_buildManifest.js`, base);
  const served = !!id && (await httpStatus(manifest.href, 5000)) === 200;
  if (!served) {
    return {
      served,
      stamp: null,
      state: 'n/a',
      detail: 'a dev server, or not the build in .next',
    };
  }
  const stamp = readJson(BUILD_STAMP);
  if (stamp?.buildId !== id) {
    return {
      served,
      stamp: null,
      state: 'unknown',
      detail: 'built without a stamp: use pnpm shots:build',
    };
  }
  const now = sourceState();
  if (!now) return { served, stamp, state: 'unknown', detail: 'no git' };
  const short = (commit) => commit.slice(0, 7);
  if (now.commit !== stamp.commit) {
    return {
      served,
      stamp,
      state: 'stale',
      detail: `built from ${short(stamp.commit)}, the source is at ${short(now.commit)}`,
    };
  }
  if (now.fingerprint !== stamp.fingerprint) {
    return {
      served,
      stamp,
      state: 'stale',
      detail: 'app source has uncommitted changes the build does not have',
    };
  }
  return {
    served,
    stamp,
    state: 'current',
    detail: `built from ${short(stamp.commit)}${stamp.dirty ? ' plus the same uncommitted changes' : ''}`,
  };
}

/** The Supabase the app talks to: the build's if stamped, else .env.local's. */
function supabaseOf(build) {
  const origin =
    build.stamp?.supabaseOrigin ?? readSettings().supabaseUrl?.origin;
  try {
    return new URL(origin);
  } catch {
    return null;
  }
}

/**
 * The signed-in user's role, read from the app's own profile request as a
 * page loads: 'citizen', 'staff', 'admin', or null when the app asked for no
 * profile, which is what signed out looks like. Only that response's body is
 * read; no cookie, header or token is touched.
 */
async function observeRole(page, base, supabase, timeoutMs) {
  let role = null;
  const prefix = new URL('/rest/v1/profiles', supabase).href;
  const onResponse = async (response) => {
    if (!response.url().startsWith(prefix) || !response.ok()) return;
    const body = await response.json().catch(() => null);
    const row = Array.isArray(body) ? body[0] : body;
    if (typeof row?.role === 'string') role = row.role;
  };
  page.on('response', onResponse);
  const network = watchNetwork(page);
  try {
    await page.goto(new URL(ROLE_PROBE, base).href, {
      waitUntil: 'domcontentloaded',
      timeout: timeoutMs,
    });
    await settle(page, network, Math.min(timeoutMs, 10000));
  } finally {
    network.stop();
    page.off('response', onResponse);
  }
  return role;
}

// ------------------------------------------------------------------ runs

const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"]/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]
  );

function contactSheet(results) {
  const cards = results.pages
    .map((p) => {
      const images = [p.image, p.scrollImage, p.diffImage]
        .filter(Boolean)
        .map(
          (file) =>
            `<a href="${escapeHtml(file)}"><img loading="lazy" src="${escapeHtml(file)}" alt=""></a>`
        )
        .join('');
      const notes = [
        p.kind === 'state' && 'state',
        p.status,
        p.changed,
        p.diffRatio && `${(p.diffRatio * 100).toFixed(2)}% of pixels differ`,
        p.as && `as ${p.as}`,
        p.httpStatus && `HTTP ${p.httpStatus}`,
        `${p.waitedSeconds} s`,
        p.sameAs && `same as ${p.sameAs}`,
        p.finalPath && p.finalPath !== p.path && `ended at ${p.finalPath}`,
        p.error,
      ].filter(Boolean);
      return `<figure class="${escapeHtml(p.changed ?? '')}">
${images || '<div class="none">no image</div>'}
<figcaption><b>${escapeHtml(p.page)}</b><br><code>${escapeHtml(p.path)}</code><br>${escapeHtml(notes.join(' · '))}</figcaption>
</figure>`;
    })
    .join('\n');
  const skipped = (results.skipped ?? [])
    .map((s) => `<li>${escapeHtml(s.page)}: ${escapeHtml(s.reason)}</li>`)
    .join('');
  return `<!doctype html>
<meta charset="utf-8">
<title>Shots ${escapeHtml(results.run)}</title>
<style>
body{font:13px system-ui,sans-serif;margin:16px;background:#f4f4f4;color:#222}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
figure{margin:0;padding:8px;background:#fff;border:1px solid #ddd;border-top:4px solid #bbb}
figure.changed{border-top-color:#d97706}figure.new{border-top-color:#2563eb}
img{width:100%;border:1px solid #eee;margin-bottom:4px}
.none{padding:32px 0;text-align:center;color:#888}
code{word-break:break-all}
</style>
<h1>${escapeHtml(results.run)}</h1>
<p>${escapeHtml(results.baseUrl)} · ${escapeHtml(results.viewport)} · font scale ${escapeHtml(results.fontScale)} · build ${escapeHtml(results.build?.state)} · ${results.pages.length} captures · orange changed, blue new, grey unchanged against the baseline</p>
<main>
${cards}
</main>
${skipped ? `<h2>Not shot</h2><ul>${skipped}</ul>` : ''}
`;
}

function saveRun(runDir, results) {
  fs.mkdirSync(runDir, { recursive: true });
  fs.writeFileSync(
    path.join(runDir, 'results.json'),
    `${JSON.stringify(results, null, 2)}\n`
  );
  fs.writeFileSync(path.join(runDir, 'index.html'), contactSheet(results));
}

function timestamp(date) {
  const two = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}` +
    `_${two(date.getHours())}${two(date.getMinutes())}${two(date.getSeconds())}`
  );
}

async function runBatch(opts) {
  if (!(await browserVersion())) {
    console.error(`No browser attached at ${CDP_URL}.`);
    console.error('Start one: pnpm shots --start-browser');
    return 1;
  }
  if ((await httpStatus(opts.base.href)) === null) {
    console.error(`Nothing answers at ${opts.base.origin}.`);
    console.error('See docs/guides/DEVICE_TESTING.md for starting the app.');
    return 1;
  }
  const build = await buildState(opts.base);
  const supabase = supabaseOf(build);
  // The same line the other scripts here draw: pages shot signed in can be
  // real people's reports and profiles.
  if (!opts.allowHosted && !(supabase && isLocal(supabase))) {
    console.error(
      `Refusing to run: the app's Supabase is ${supabase?.origin ?? 'not set'}, not the local stack.`
    );
    console.error('--allow-hosted overrides this.');
    return 1;
  }

  const { browser, context, page: firstPage } = await attach();
  let page = firstPage;
  let cdp = null;
  let interrupted = false;
  const onInterrupt = () => {
    interrupted = true;
  };
  process.once('SIGINT', onInterrupt);

  // What makes runs comparable. A browser has no status bar or clock to pin;
  // what moves between two captures of one page is animation, so motion is
  // turned off (and screenshot.mjs freezes what is left at capture time).
  const prepare = async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    if (opts.fontScale !== 1) {
      cdp = await context.newCDPSession(page);
      await cdp.send('Page.setFontSizes', {
        fontSizes: {
          standard: Math.round(16 * opts.fontScale),
          fixed: Math.round(13 * opts.fontScale),
        },
      });
    }
  };
  const restore = async () => {
    await page.emulateMedia({ reducedMotion: null }).catch(() => {});
    if (cdp) {
      await cdp
        .send('Page.setFontSizes', { fontSizes: { standard: 16, fixed: 13 } })
        .catch(() => {});
      await cdp.detach().catch(() => {});
      cdp = null;
      // The page still on screen was laid out with the larger font.
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    }
  };

  try {
    if (opts.clear) {
      // Once per batch. Signing out is the slow, state-losing step; opening
      // the next URL in the same browser is not.
      await context.clearCookies();
      const storage = await context.newCDPSession(page);
      await storage.send('Storage.clearDataForOrigin', {
        origin: opts.base.origin,
        storageTypes: 'all',
      });
      await storage.detach();
    }
    await prepare();

    // --as is a claim; check it before a whole batch is shot as the wrong
    // user. Signed out, the app asks for no profile.
    let asVerified = false;
    if (ROLES.includes(opts.as) && supabase) {
      const seen = await observeRole(
        page,
        opts.base,
        supabase,
        opts.timeout * 1000
      );
      if ((seen ?? 'guest') !== opts.as) {
        console.error(
          `--as ${opts.as}, but the browser is ${seen ? `signed in as ${seen}` : 'signed out'}.`
        );
        return 1;
      }
      asVerified = true;
    }

    const viewport = await viewportOf(page);
    const { targets, skipped } = fromManifest(opts, viewport);
    // Pages named on the command line get the manifest's defaults too.
    const defaults = readJson(MANIFEST)?.defaults ?? {};
    targets.push(...opts.pages.map((p) => ({ ...defaults, ...p })));
    const names = targets.map((t) => t.name);
    const repeated = names.find((name, i) => names.indexOf(name) !== i);
    if (repeated) throw new Error(`Two captures are named "${repeated}".`);

    const started = new Date();
    const run = opts.run ?? `${timestamp(started)}_${viewport}`;
    const runDir = path.join(SHOTS_DIR, run);
    const earlier = readJson(path.join(runDir, 'results.json'));
    if (earlier && earlier.viewport !== viewport) {
      throw new Error(
        `screenshots/${run} was shot at ${earlier.viewport}; the browser is now ${viewport}.`
      );
    }
    const results = {
      run,
      startedAt: earlier?.startedAt ?? started.toISOString(),
      finishedAt: null,
      baseUrl: opts.base.origin,
      viewport,
      fontScale: opts.fontScale,
      browser: await browserVersion(),
      build: {
        state: build.state,
        detail: build.detail,
        commit: build.stamp?.commit ?? null,
      },
      supabase: supabase?.origin ?? null,
      pages: (earlier?.pages ?? []).filter((p) => !names.includes(p.page)),
      skipped: [
        ...(earlier?.skipped ?? []).filter(
          (s) => !skipped.some((now) => now.page === s.page)
        ),
        ...skipped,
      ],
    };
    const ctx = {
      base: opts.base,
      as: opts.as,
      runDir,
      baselineDir: baselineDir(viewport, opts.fontScale),
      scroll: opts.scroll,
      timeoutMs: opts.timeout * 1000,
      entries: results.pages,
    };
    if (build.state === 'stale') console.log(`Stale build: ${build.detail}.`);

    const rows = [];
    for (const target of targets) {
      if (interrupted) break;
      const entry = await shoot(page, target, ctx);
      entry.asVerified = asVerified;
      results.pages.push(entry);
      results.finishedAt = new Date().toISOString();
      saveRun(runDir, results);
      rows.push([
        entry.page,
        entry.status,
        entry.sameAs ? `same as ${entry.sameAs}` : (entry.changed ?? '-'),
        `${entry.waitedSeconds} s`,
        entry.error ?? '',
      ]);
      console.log(`${entry.page}: ${entry.status}`);
      if (entry.status === 'crashed') {
        // A crashed tab cannot be reused.
        page = await context.newPage();
        cdp = null;
        await prepare();
      }
    }
    saveRun(runDir, results);

    console.log('');
    printTable(['Capture', 'Status', 'Against baseline', 'Took', 'Note'], rows);
    for (const { page: name, reason } of skipped) {
      console.log(`Not shot: ${name} (${reason})`);
    }
    console.log('');
    console.log(`Results: ${path.join(runDir, 'results.json')}`);
    console.log(`Sheet:   ${path.join(runDir, 'index.html')}`);
    if (interrupted) console.log('Interrupted: the rest were not shot.');
    return 0;
  } finally {
    process.off('SIGINT', onInterrupt);
    await restore();
    await browser.close().catch(() => {});
  }
}

// ------------------------------------------------------------- preflight

async function preflight(opts) {
  const rows = [];
  const version = await browserVersion();
  rows.push([
    'Browser',
    version ? 'attached' : 'MISSING',
    version ?? `nothing at ${CDP_URL}; pnpm shots --start-browser`,
  ]);

  const appStatus = await httpStatus(opts.base.href);
  const build =
    appStatus === null
      ? { served: false, stamp: null, state: 'n/a', detail: 'no app' }
      : await buildState(opts.base);
  rows.push([
    'App',
    appStatus === null ? 'MISSING' : `HTTP ${appStatus}`,
    appStatus === null
      ? `nothing answers at ${opts.base.origin}`
      : build.served
        ? `the production build in .next, at ${opts.base.origin}`
        : `${opts.base.origin}: a dev server, or not the build in .next`,
  ]);
  rows.push(['Build age', build.state.toUpperCase(), build.detail]);

  const settings = readSettings();
  const supabase = supabaseOf(build);
  rows.push([
    'Supabase',
    !supabase
      ? 'not set'
      : !isLocal(supabase)
        ? 'HOSTED'
        : (await httpStatus(
              new URL('/auth/v1/health', supabase).href,
              4000
            )) === null
          ? 'DOWN'
          : 'answers',
    !supabase
      ? 'NEXT_PUBLIC_SUPABASE_URL is missing from .env.local'
      : isLocal(supabase)
        ? `${supabase.origin} (npx supabase start)`
        : `${supabase.origin}: not the local stack; a batch will refuse to run`,
  ]);

  const backend = settings.backendUrl;
  rows.push([
    'Simulation server',
    !backend
      ? 'not set'
      : !isLocal(backend)
        ? 'hosted'
        : (await httpStatus(backend.href, 4000)) === null
          ? 'DOWN'
          : 'answers',
    !backend
      ? 'NEXT_PUBLIC_BACKEND_URL is missing: custom runs cannot work'
      : isLocal(backend)
        ? backend.origin
        : `${backend.origin}: not contacted; custom runs would go there`,
  ]);

  const envMoved =
    build.stamp &&
    settings.changedAt > new Date(build.stamp.stampedAt).getTime();
  rows.push([
    'Settings',
    !settings.present
      ? 'MISSING'
      : envMoved || !settings.anonKey || !settings.mapboxToken
        ? 'check'
        : 'ok',
    !settings.present
      ? 'no .env.local'
      : [
          `anon key ${settings.anonKey ? 'set' : 'MISSING'}`,
          `Mapbox token ${settings.mapboxToken ? 'set' : 'missing (maps show their error)'}`,
          envMoved && '.env.local changed after the build: rebuild to apply it',
        ]
          .filter(Boolean)
          .join('; '),
  ]);

  let probeText = null;
  if (version && appStatus !== null) {
    const { browser, page } = await attach();
    const network = watchNetwork(page);
    try {
      const role = supabase
        ? await observeRole(page, opts.base, supabase, opts.timeout * 1000)
        : undefined;
      await page.goto(new URL(opts.probe, opts.base).href, {
        waitUntil: 'domcontentloaded',
        timeout: opts.timeout * 1000,
      });
      probeText = (await settle(page, network, opts.timeout * 1000)).text;
      rows.push(['Viewport', await viewportOf(page), 'what the page gets']);
      rows.push([
        'Session',
        role === undefined ? 'unknown' : (role ?? 'signed out'),
        role === undefined
          ? `see the text of ${opts.probe} below`
          : role
            ? 'the role in the profile the app loaded'
            : 'the app asked for no profile',
      ]);
    } catch (err) {
      rows.push(['Session', 'unknown', redact(err.message.split('\n')[0])]);
    } finally {
      network.stop();
      await browser.close().catch(() => {});
    }
  } else {
    rows.push(['Session', 'unknown', 'needs the browser and the app']);
  }

  printTable(['Check', 'State', 'Detail'], rows);
  if (probeText !== null) {
    console.log('');
    console.log(`First screen text (${opts.probe}):`);
    console.log(probeText ? redact(probeText.slice(0, 800)) : '(no text)');
  }
  return version && appStatus !== null ? 0 : 1;
}

// ------------------------------------------------------------------ main

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    if (!(err instanceof UsageError)) return 1;
    console.error('');
    console.error(USAGE);
    return 2;
  }
  if (opts.mode === 'start') return startBrowser(opts);
  if (opts.mode === 'stop') return stopBrowser();
  if (opts.mode === 'stamp') return stampBuild();
  if (opts.mode === 'accept') return acceptRun(opts);
  if (opts.mode === 'preflight') return preflight(opts);
  if (
    opts.mode === 'help' ||
    (opts.pages.length === 0 && opts.groups.length === 0)
  ) {
    console.log(USAGE);
    return 0;
  }
  return runBatch(opts);
}

try {
  process.exitCode = await main();
} catch (err) {
  console.error(redact(err.message));
  process.exitCode = 1;
}
