// Screenshot pages and states in the shots browser, and say which changed.
//
//   pnpm shots --start-browser [--viewport laptop] [--headed]
//   pnpm shots --preflight
//   pnpm shots [options] --group <name> [--states] [--only <name,...>]
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
// contact sheet; each capture is compared with screenshots/baseline/, which
// only --accept changes.
//
// A run refuses rather than guesses: it stops when the app's backend is not
// local, when the build is not the current source, when the browser on the
// port is not its own, and when it cannot tell who is signed in.
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
  ENDPOINT_FILE,
  NOT_OURS,
  PROFILE_DIR,
  SHOTS_DIR,
  attach,
  browserInfo,
  capture,
  captureBuffer,
  sanitise,
} from './screenshot.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MANIFEST = path.join(ROOT, 'scripts', 'shots.manifest.json');
const BASELINE_DIR = path.join(SHOTS_DIR, 'baseline');
const BUILD_STAMP = path.join(ROOT, '.next', 'shots-build.json');
const BUILD_BEGIN = path.join(
  ROOT,
  'node_modules',
  '.cache',
  'shots-build-begin.json'
);
const PID_FILE = path.join(PROFILE_DIR, 'shots-browser.pid');
const DEFAULT_BASE_URL = 'http://localhost:3056';
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
const TEXT_LIMIT = 20000;
// How a capture is judged against its reference image. Counts are pixels,
// not a share of the screen: a share lets anything smaller than an icon pass.
// Outside soft areas this browser redraws an unchanged page pixel for pixel
// (measured here 2026-10-10), so the strict delta only has to clear rounding.
// A channel is 0 to 255.
const STRICT_DELTA = 4;
const TOLERANCE_PX = 12;
// Soft areas (see regionsOf) are where the map shows: it is drawn a fraction
// of a pixel off from one load to the next.
const SOFT_DELTA = 24;
const SOFT_TOLERANCE_PX = 250;
const SOFT_CELL = 4;
const SOFT_RADIUS = 2;
const BOX = 64;
// Text that differs between two loads of an unchanged page.
const MASK_TEXT = [/\b\d{1,2}:\d{2}\s?[AP]M\b/g, /Updated .{1,40}? ago/g];
// What counts as the app's own source when asking "is this build stale?".
const APP_SOURCE = [
  '.',
  ':!docs',
  ':!scripts',
  ':!e2e',
  ':!supabase',
  ':!*.md',
];
const FAILED = [
  'error',
  'crashed',
  'blank',
  'left-app',
  'state-error',
  'http-error',
];
// What a page given on the command line or in a --pages file may set. Not
// steps: a state belongs in the manifest, where it can be read and reviewed.
const PAGE_KEYS = [
  'name',
  'path',
  'tolerance',
  'softTolerance',
  'ignore',
  'ignoreText',
  'soft',
];

const USAGE = `Usage:
  pnpm shots --start-browser [--viewport <size>] [--headed]
  pnpm shots --preflight [--base-url <url>] [--probe <path>]
  pnpm shots [options] --group <name> [--states] [--only <name,...>]
  pnpm shots [options] <name>=<path> ...
  pnpm shots --accept <run> [<name> ...] [--force]
  pnpm shots --clear | --forget-profile | --stop-browser

Device:
  --start-browser     Start Chromium in the background and wait for it.
  --viewport <size>   ${Object.keys(VIEWPORTS).join(', ')} or WIDTHxHEIGHT (default laptop).
  --headed            Show the window, e.g. to sign in by hand.
  --stop-browser      Close it. The profile, and any session in it, is kept.
  --clear             Sign the browser out of the app: clear its cookies and
                      storage for the app's origin. Alone, or before a batch.
  --forget-profile    Stop the browser and delete its profile folder.

Checks:
  --preflight         Print one table (browser, app, build age, backend,
                      settings, session) and open no page from the list.
  --probe <path>      Also print that page's text in the preflight.
  pnpm shots:build    Build, and record which source the build was made from.

What to shoot:
  --group <name>      Every page of that group in scripts/shots.manifest.json;
                      "all" for every group. May be repeated.
  --states            With --group: also the group's scripted states.
  --only <name,...>   Only those captures from the manifest, pages or states,
                      e.g. to shoot again the ones a run could not judge.
  <name>=<path>       One page, e.g. docs=/docs. The leading slash may be left
                      off (docs=docs), which Git Bash needs.
  --pages <file>      JSON array of {"name", "path"}: no shell quoting at all.

Batch:
  --base-url <url>    Where the app is served (default ${DEFAULT_BASE_URL},
                      or SHOTS_BASE_URL).
  --run <folder>      Add to screenshots/<folder> instead of a new dated one.
  --as <role>         Who is signed in: ${ROLES.join(', ')} (default guest).
                      Checked against the browser before the first page.
  --against <run>     Compare with that run's folder instead of the baseline.
  --scroll            Also capture after one wheel-scroll, if anything moved.
  --font-scale <n>    Scale the browser's default font size for this run.
  --timeout <sec>     Longest wait for a page to settle (default 30).
  --stop-after        Close the browser when the batch ends.
  --allow-stale       Run although the build is not the current source
                      (stale, unstamped, or a dev server).
  --allow-hosted      Run although the app or its Supabase is not local.

Baseline:
  --accept <run>      Make that run's new and changed captures the baseline;
                      name pages to accept only those. Replaced files go to
                      baseline/<size>/.history/.
  --force             With --accept: also take captures that were unsettled,
                      failed, or shot on a build that was not current.

Exit code: 0 when every capture was taken, changed or not; 1 when the run was
refused, interrupted, or a capture failed; 2 for a usage error.`;

class UsageError extends Error {}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const HUNG = Symbol('hung');

/**
 * The promise's result, or HUNG if it has not come within `ms`. A page whose
 * renderer stops answering leaves every call on it waiting for ever; one such
 * page held a whole run for a quarter of an hour here.
 */
function withDeadline(promise, ms) {
  let timer;
  promise.catch(() => {});
  return Promise.race([
    promise,
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(HUNG), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

/** Keys and tokens turn up in URLs inside console messages; never keep one. */
const redact = (value) =>
  String(value)
    .replace(/(?:[ps]k\.)?eyJ[\w-]+(?:\.[\w-]+)+/g, '<redacted>')
    .replace(/\bsb_(?:publishable|secret)_[\w-]+/g, '<redacted>')
    .replace(/\bAIza[\w-]{20,}/g, '<redacted>')
    .replace(/\bBearer\s+[\w.~+/=-]+/gi, 'Bearer <redacted>')
    .replace(
      /\b(apikey|access_token|refresh_token|token|key|code|password|secret)=[^&\s'"]+/gi,
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

/** A page from the command line or a --pages file: PAGE_KEYS and no more. */
const handGiven = (item) =>
  pageSpec(
    Object.fromEntries(
      PAGE_KEYS.filter((key) => item[key] !== undefined).map((key) => [
        key,
        item[key],
      ])
    )
  );

function parseArgs(argv) {
  const opts = {
    mode: 'run',
    pages: [],
    groups: [],
    only: [],
    states: false,
    accept: null,
    acceptNames: [],
    against: null,
    baseUrl: process.env.SHOTS_BASE_URL ?? DEFAULT_BASE_URL,
    probe: null,
    viewport: 'laptop',
    headed: false,
    clear: false,
    scroll: false,
    begin: false,
    force: false,
    stopAfter: false,
    allowHosted: false,
    allowStale: false,
    fontScale: 1,
    timeout: 30,
    run: null,
    as: 'guest',
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
    else if (arg === '--forget-profile') opts.mode = 'forget';
    else if (arg === '--stamp-build') opts.mode = 'stamp';
    else if (arg === '--accept') {
      opts.mode = 'accept';
      opts.accept = sanitise(take(++i, arg));
    } else if (arg === '--begin') opts.begin = true;
    else if (arg === '--force') opts.force = true;
    else if (arg === '--headed') opts.headed = true;
    else if (arg === '--clear') opts.clear = true;
    else if (arg === '--scroll') opts.scroll = true;
    else if (arg === '--states') opts.states = true;
    else if (arg === '--stop-after') opts.stopAfter = true;
    else if (arg === '--allow-hosted') opts.allowHosted = true;
    else if (arg === '--allow-stale') opts.allowStale = true;
    else if (arg === '--viewport') opts.viewport = take(++i, arg);
    else if (arg === '--base-url') opts.baseUrl = take(++i, arg);
    else if (arg === '--probe') opts.probe = normalisePath(take(++i, arg));
    else if (arg === '--run') opts.run = sanitise(take(++i, arg));
    else if (arg === '--against') opts.against = sanitise(take(++i, arg));
    else if (arg === '--as') opts.as = take(++i, arg).toLowerCase();
    else if (arg === '--group') opts.groups.push(...take(++i, arg).split(','));
    else if (arg === '--only') opts.only.push(...take(++i, arg).split(','));
    else if (arg === '--timeout') opts.timeout = Number(take(++i, arg));
    else if (arg === '--font-scale') opts.fontScale = Number(take(++i, arg));
    else if (arg === '--pages') {
      const file = take(++i, arg);
      const list = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!Array.isArray(list)) {
        throw new UsageError(`${file} must hold a JSON array.`);
      }
      opts.pages.push(...list.map(handGiven));
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
      handGiven({ name: arg.slice(0, eq), path: arg.slice(eq + 1) })
    );
  }
  if (!ROLES.includes(opts.as)) {
    throw new UsageError(
      `--as "${opts.as}" is not a role. Roles: ${ROLES.join(', ')}.`
    );
  }
  if (!(opts.timeout > 0)) throw new UsageError('--timeout must be positive.');
  if (!(opts.fontScale >= 0.5 && opts.fontScale <= 4)) {
    throw new UsageError('--font-scale must be between 0.5 and 4.');
  }
  // Named captures are looked for everywhere unless a group narrows it.
  if (opts.only.length && opts.groups.length === 0) opts.groups.push('all');
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

/** What a URL answers with ({ status, headers }), or null when nothing does. */
async function httpGet(url, timeoutMs = 15000) {
  try {
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });
    return { status: res.status, headers: res.headers };
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

const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');

function timestamp(date) {
  const two = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}` +
    `_${two(date.getHours())}${two(date.getMinutes())}${two(date.getSeconds())}`
  );
}

// ---------------------------------------------------------------- device

/**
 * Playwright's headless-shell build of the same Chromium, or null. It is what
 * the e2e specs run in, and the only one whose --window-size is the page
 * size: full Chromium run headless takes its window frame out of it (1366x768
 * gave a 1348x616 page here) and will not go narrower than about 480.
 */
function headlessShell() {
  // The revision folder is two levels up on Windows and Linux and deeper on
  // macOS (inside the .app), so walk up to it. Not run on macOS here.
  let revisionDir = path.dirname(chromium.executablePath());
  while (!/^chromium-\d+$/.test(path.basename(revisionDir))) {
    const parent = path.dirname(revisionDir);
    if (parent === revisionDir) return null;
    revisionDir = parent;
  }
  const shellDir = path.join(
    path.dirname(revisionDir),
    path.basename(revisionDir).replace(/^chromium-/, 'chromium_headless_shell-')
  );
  if (!fs.existsSync(shellDir)) return null;
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
  const running = await browserInfo();
  if (running?.ours) {
    console.log(`Already running at ${CDP_URL} (${running.version}).`);
    console.log('To change size or show the window: --stop-browser first.');
    return 0;
  }
  if (running) {
    console.error(NOT_OURS);
    return 1;
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
  // One left by a browser that was killed would vouch for the wrong browser.
  fs.rmSync(ENDPOINT_FILE, { force: true });
  // Spawned directly, never through a shell. --hide-scrollbars is what
  // Playwright's own headless runs use, so widths match the e2e specs. The
  // rest keep the browser from fetching, updating or recolouring on its own.
  const args = [
    `--remote-debugging-port=${new URL(CDP_URL).port || '9222'}`,
    `--user-data-dir=${PROFILE_DIR}`,
    `--window-size=${width},${height}`,
    '--force-device-scale-factor=1',
    '--force-color-profile=srgb',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-default-apps',
    '--disable-sync',
    '--metrics-recording-only',
    '--disable-features=Translate,OptimizationHints,MediaRouter',
    ...(opts.headed || exe === shell ? [] : ['--headless=new']),
    'about:blank',
  ];
  let spawnError = null;
  const child = spawn(exe, args, { detached: true, stdio: 'ignore' });
  child.on('error', (err) => {
    spawnError = err;
  });
  child.unref();
  // For --stop-browser, should the browser stop answering.
  if (child.pid) fs.writeFileSync(PID_FILE, String(child.pid));

  for (let waited = 0; waited < 20000 && !spawnError; waited += 250) {
    await delay(250);
    const info = await browserInfo();
    if (info?.ours) {
      console.log(`Started ${info.version} at ${CDP_URL}.`);
      console.log(
        `Asked for ${width}x${height}${opts.headed ? ', headed' : ''}; ` +
          '--preflight prints the size the page really gets.'
      );
      return 0;
    }
  }
  console.error(
    spawnError
      ? `Could not start ${exe}: ${spawnError.message}`
      : `The browser did not answer at ${CDP_URL} within 20 s.`
  );
  return 1;
}

async function stopBrowser() {
  const info = await browserInfo();
  if (!info) {
    console.log(`No browser at ${CDP_URL}.`);
    return 0;
  }
  if (!info.ours) {
    console.error(NOT_OURS);
    return 1;
  }
  // Asked nicely first, with a time limit: a browser whose renderer has
  // frozen accepts the connection and then never answers (seen here under
  // load, with the map drawn in software).
  const asked = (async () => {
    const browser = await chromium.connectOverCDP(CDP_URL, { timeout: 8000 });
    const session = await browser.newBrowserCDPSession();
    // The connection drops as the browser exits, so no reply may come.
    session.send('Browser.close').catch(() => {});
    await delay(500);
    await browser.close().catch(() => {});
  })();
  await withDeadline(asked, 10000);
  // Not done until the port is free: a start straight after would otherwise
  // find the dying browser and report it as already running.
  const gone = async (ms) => {
    for (let waited = 0; (await browserInfo()) && waited < ms; waited += 200) {
      await delay(200);
    }
    return !(await browserInfo());
  };
  if (!(await gone(5000))) {
    // Only ever the process this script started, by the id it wrote down.
    const pid = Number(fs.readFileSync(PID_FILE, 'utf8').trim() || 0);
    if (pid) {
      try {
        process.kill(pid);
      } catch {
        // Already gone.
      }
    }
    if (!(await gone(5000))) {
      console.error(`The browser at ${CDP_URL} would not stop.`);
      return 1;
    }
    console.log('It was not answering, so its process was ended.');
  }
  fs.rmSync(ENDPOINT_FILE, { force: true });
  fs.rmSync(PID_FILE, { force: true });
  console.log('Browser closed. Its profile, and any session in it, is kept.');
  return 0;
}

async function forgetProfile() {
  if ((await browserInfo())?.ours && (await stopBrowser()) !== 0) return 1;
  fs.rmSync(PROFILE_DIR, { recursive: true, force: true });
  console.log(`Deleted ${PROFILE_DIR}.`);
  return 0;
}

/**
 * Sign the browser out of the app: its cookies and storage for the app's
 * origin, under both names this machine goes by. The storage is the part
 * that holds the session. Nothing else in the profile is touched.
 */
async function clearSession(context, page, base) {
  const twin = new URL(base.href);
  twin.hostname = base.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
  // An app page left open would write its session straight back.
  await page.goto('about:blank');
  const cdp = await context.newCDPSession(page);
  for (const url of [base, twin]) {
    await context.clearCookies({ domain: url.hostname });
    await cdp.send('Storage.clearDataForOrigin', {
      origin: url.origin,
      storageTypes: 'all',
    });
  }
  await cdp.detach();
  return [base.origin, twin.origin];
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

/** The page's text with what the clock alone changes replaced. */
const maskText = (text) =>
  MASK_TEXT.reduce((masked, pattern) => masked.replace(pattern, '~'), text);

/**
 * Watches a page's requests: how long none has been in flight, which hosts
 * other than this machine it called, which requests failed, which were
 * writes, and whether any went to a Supabase that is not on this machine.
 */
async function watchNetwork(page, context) {
  const pending = new Set();
  const hosts = new Set();
  const failed = [];
  const writes = [];
  let hostedBackend = null;
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
    if (!isLocal(url)) {
      hosts.add(url.host);
      if (
        /^\/(rest|auth|storage|realtime|functions)\/v1\//.test(url.pathname)
      ) {
        hostedBackend ??= url.host;
      }
    }
    // Without the query string, which is where keys and tokens ride.
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method()) &&
      writes.length < 10
    ) {
      writes.push(`${request.method()} ${url.origin}${url.pathname}`);
    }
  };
  const done = (request) => {
    if (pending.delete(request) && pending.size === 0) quietSince = Date.now();
  };
  // What the map is drawn from. Not its usage reports (events.mapbox.com,
  // map-sessions), and not a request the map itself called off.
  const mapFailed = [];
  const forMap = (url) =>
    /(^|\.)mapbox\.com$/.test(url.hostname) &&
    url.hostname !== 'events.mapbox.com' &&
    !url.pathname.startsWith('/map-sessions/');
  const noteMap = (url) => {
    if (mapFailed.length < 5) mapFailed.push(url.origin + url.pathname);
  };
  const onFailed = (request) => {
    const url = bare(request);
    if (url && failed.length < 5) failed.push(url.origin + url.pathname);
    if (
      url &&
      forMap(url) &&
      request.failure()?.errorText !== 'net::ERR_ABORTED'
    ) {
      noteMap(url);
    }
    done(request);
  };
  // The app's own backend falling over: the page then shows less, or an
  // error, and that is the backend's state, not the app's.
  const backendFailed = [];
  const onResponse = (response) => {
    const url = bare(response.request());
    if (!url) return;
    if (forMap(url) && response.status() >= 400) noteMap(url);
    if (response.status() >= 500 && isLocal(url) && backendFailed.length < 5) {
      backendFailed.push(`${response.status()} ${url.origin}${url.pathname}`);
    }
  };
  // Requests the page before this one left behind never report an ending
  // when their frame goes (seen with the docs page's embedded video, which
  // held the next page up for the full timeout), so start again from zero on
  // a real navigation. Not on a URL change within the page, such as a tab
  // switch: the requests it starts are exactly the ones to wait for.
  const cdp = await context.newCDPSession(page);
  await cdp.send('Page.enable');
  cdp.on('Page.frameNavigated', ({ frame }) => {
    if (frame.parentId) return;
    pending.clear();
    quietSince = Date.now();
  });
  page.on('request', onRequest);
  page.on('requestfinished', done);
  page.on('requestfailed', onFailed);
  page.on('response', onResponse);
  return {
    mapFailed: () => mapFailed,
    backendFailed: () => backendFailed,
    quietFor() {
      for (const request of pending) {
        let gone = false;
        try {
          gone = request.frame().isDetached();
        } catch {
          gone = true;
        }
        if (gone) done(request);
      }
      return pending.size === 0 ? Date.now() - quietSince : 0;
    },
    hosts: () => [...hosts].sort(),
    failed: () => failed,
    writes: () => writes,
    hostedBackend: () => hostedBackend,
    async stop() {
      page.off('request', onRequest);
      page.off('requestfinished', done);
      page.off('requestfailed', onFailed);
      page.off('response', onResponse);
      await cdp.detach().catch(() => {});
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
 * capture in 36 here caught it without its flood areas. A manifest entry can
 * ask for longer with `still` (milliseconds), as the map pages do.
 *
 * A page with a map has a fourth condition: the map says it has loaded
 * (mapState). Stillness cannot stand in for that. The map reads its tiles
 * from the browser's cache and builds them off the main thread, so on a busy
 * machine it can sit unchanged for seconds with half of itself missing.
 */
async function settle(page, network, timeoutMs, stillMs = STILL_MS) {
  const deadline = Date.now() + timeoutMs;
  const spent = { text: 0, network: 0, map: 0, pixels: 0 };
  let lastText = '';
  let lastShot = null;
  let stillSince = 0;
  let waitingOn = 'text';
  let map = null;
  let lap = Date.now();
  while (Date.now() < deadline) {
    await delay(POLL_MS);
    const text = await readText(page);
    if (!text || text !== lastText) {
      waitingOn = 'text';
      lastShot = null;
    } else if (network.quietFor() < QUIET_MS) {
      waitingOn = 'network';
      lastShot = null;
    } else if ((map = await mapState(page))?.state === 'loading') {
      waitingOn = 'map';
      lastShot = null;
    } else {
      const shot = await captureBuffer(page);
      waitingOn = 'pixels';
      if (!lastShot?.equals(shot)) stillSince = Date.now();
      else if (Date.now() - stillSince >= stillMs) {
        spent.pixels += Date.now() - lap;
        // Asked once more: a map can start loading again while it is watched.
        map = await mapState(page);
        if (map?.state !== 'loading') {
          return { text, shot, settled: true, waitingOn: null, spent, map };
        }
        lap = Date.now();
        waitingOn = 'map';
      }
      lastShot = shot;
    }
    spent[waitingOn] += Date.now() - lap;
    lap = Date.now();
    lastText = text;
  }
  return {
    text: lastText,
    shot: lastShot ?? (await captureBuffer(page)),
    settled: false,
    waitingOn,
    spent,
    map: await mapState(page),
  };
}

/**
 * Whether the maps on the page have finished loading: null when there is no
 * map, else a state ('loaded', 'loading' or 'unreadable') with how many
 * tiles the maps hold and how many of those failed.
 *
 * The app does not say when its map is done, and these scripts may not
 * change the app, so the map is asked directly. Each map sits in a React ref
 * of the component that made it; this walks up from the map's element
 * through React's own bookkeeping until it finds an object that answers like
 * a Mapbox map, and calls its public loaded(). It reads and nothing else.
 * It leans on React internals, so a React or app change can break it: then
 * the answer is 'unreadable', the capture falls back to stillness alone, and
 * the entry says so.
 */
async function mapState(page) {
  try {
    return await page.evaluate(() => {
      const isMap = (value) =>
        value &&
        typeof value === 'object' &&
        typeof value.loaded === 'function' &&
        typeof value.isMoving === 'function' &&
        typeof value.getCanvas === 'function';
      const mapOf = (el) => {
        const key = Object.keys(el).find((k) => k.startsWith('__reactFiber$'));
        let fiber = key ? el[key] : null;
        for (let up = 0; fiber && up < 60; up++, fiber = fiber.return) {
          let hook = fiber.memoizedState;
          for (let n = 0; hook && typeof hook === 'object' && n < 200; n++) {
            if (!('next' in hook)) break;
            const held = hook.memoizedState;
            if (isMap(held)) return held;
            if (held && typeof held === 'object' && isMap(held.current)) {
              return held.current;
            }
            hook = hook.next;
          }
        }
        return null;
      };
      const elements = [...document.querySelectorAll('.mapboxgl-map')];
      if (elements.length === 0) return null;
      const seen = { state: 'loaded', tiles: 0, errored: 0, view: [] };
      for (const el of elements) {
        const map = mapOf(el);
        if (!map) {
          seen.state = 'unreadable';
          continue;
        }
        if (!map.loaded() || map.isMoving()) seen.state = 'loading';
        // Where the map is looking and how big it drew itself: two captures
        // that differ here differ all over, by a fraction of a pixel.
        const canvas = map.getCanvas();
        const box = el.getBoundingClientRect();
        const centre = map.getCenter();
        seen.view.push(
          [
            `${canvas.width}x${canvas.height}`,
            `shown ${canvas.clientWidth}x${canvas.clientHeight}`,
            `in ${box.width.toFixed(2)}x${box.height.toFixed(2)}`,
            `from ${box.left.toFixed(2)},${box.top.toFixed(2)}`,
            `at ${centre.lng.toFixed(5)},${centre.lat.toFixed(5)}`,
            `zoom ${map.getZoom().toFixed(3)}`,
            `pitch ${map.getPitch().toFixed(1)}`,
            `bearing ${map.getBearing().toFixed(1)}`,
            `terrain ${map.getTerrain?.() ? 'on' : 'off'}`,
          ].join(' ')
        );
        // A tile that failed counts as loaded to the map, and leaves a hole.
        // Mapbox's own records, read if they are where 3.x keeps them.
        for (const cache of Object.values(map.style?._sourceCaches ?? {})) {
          for (const tile of Object.values(cache?._tiles ?? {})) {
            seen.tiles++;
            if (tile.state === 'errored') seen.errored++;
          }
        }
      }
      return seen;
    });
  } catch {
    return { state: 'unreadable', tiles: 0, errored: 0, view: [] };
  }
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

/**
 * Run a state's steps in order; throws naming the step that failed. What a
 * fill types is never echoed, and a fill into a password field is refused:
 * signing in is not this script's to do.
 */
async function runSteps(page, steps) {
  for (const [index, step] of steps.entries()) {
    const timeout = STEP_TIMEOUT_MS;
    try {
      if (step.click) await locate(page, step.click).click({ timeout });
      else if (step.hover) await locate(page, step.hover).hover({ timeout });
      else if (step.fill) {
        const field = locate(page, step.fill);
        const kind = await field.evaluate(
          (el) => `${el.type ?? ''} ${el.autocomplete ?? ''}`,
          null,
          { timeout }
        );
        if (/password|one-time-code/.test(kind)) {
          throw new Error('will not fill a password or one-time-code field');
        }
        await field.fill(String(step.value ?? ''), { timeout });
      } else if (step.press) await page.keyboard.press(step.press);
      else if (step.waitFor) {
        await locate(page, step.waitFor).first().waitFor({ timeout });
      } else throw new Error('unknown step');
    } catch (err) {
      const shown =
        step.value === undefined
          ? step
          : { ...step, value: `<${String(step.value).length} chars>` };
      throw new Error(
        `step ${index + 1} ${JSON.stringify(shown)}: ${err.message.split('\n')[0]}`
      );
    }
  }
}

/**
 * While a state's steps run, stop the writes that would leave this machine
 * or cost money: anything but a read to a host that is not local (map
 * telemetry aside), and the chatbot, which calls a paid model. Writes to the
 * local database are let through and recorded.
 */
async function withWritesGuarded(page, blocked, run) {
  const guard = (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const write = !['GET', 'HEAD', 'OPTIONS'].includes(request.method());
    const away = !isLocal(url) && url.host !== 'events.mapbox.com';
    if (write && (away || url.pathname === '/api/chatbot')) {
      blocked.push(`${request.method()} ${url.origin}${url.pathname}`);
      return route.abort();
    }
    return route.fallback();
  };
  await page.route('**/*', guard);
  try {
    await run();
  } finally {
    await page.unroute('**/*', guard).catch(() => {});
  }
}

// --------------------------------------------------------------- compare

/**
 * Which parts of the screen a comparison should treat differently, measured
 * on the live page:
 * - `ignore`: rectangles left out altogether. From `ignore` selectors, and
 *   from `ignoreText` patterns (the box of the matching text itself, such as
 *   a clock time, not of the element around it).
 * - `soft`: a grid marking where an element matching a `soft` selector is
 *   the topmost thing on screen. The map canvas runs under the whole page,
 *   so its rectangle would cover the panels too; the grid is only the map
 *   that can be seen.
 */
const regionsOf = (page, target) =>
  page.evaluate(
    ({ ignore, ignoreText, soft, cell }) => {
      const rect = (box) => ({
        x: Math.floor(box.x),
        y: Math.floor(box.y),
        width: Math.ceil(box.width),
        height: Math.ceil(box.height),
      });
      const rects = ignore.flatMap((selector) =>
        [...document.querySelectorAll(selector)].map((el) =>
          rect(el.getBoundingClientRect())
        )
      );
      if (ignoreText.length) {
        const patterns = ignoreText.map((source) => new RegExp(source));
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT
        );
        const range = document.createRange();
        for (let node; (node = walker.nextNode()); ) {
          const text = node.nodeValue.trim();
          if (!text || !patterns.some((p) => p.test(text))) continue;
          range.selectNodeContents(node);
          for (const box of range.getClientRects()) {
            if (box.width > 0 && box.height > 0) rects.push(rect(box));
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
 * Compare a capture with its reference image, pixel by pixel, skipping the
 * ignored rectangles. Outside soft areas a pixel differs when a channel is
 * off by more than STRICT_DELTA. Inside, it differs only when it has no
 * match within SOFT_RADIUS in either direction: nothing near it in the
 * reference looks like it, or nothing near it now looks like what the
 * reference had there. Both are needed. With only the first, a line that
 * vanishes from the map is never counted, because bare map is always
 * somewhere within two pixels of a thin line.
 *
 * Returns pixel counts, never a share of the screen, and writes a diff image
 * (the capture greyed out, differing pixels red) when anything differs.
 */
async function compareImages(file, reference, regions = {}) {
  const { ignore = [], soft = null, diffFile } = regions;
  const nowBytes = fs.readFileSync(file);
  if (nowBytes.equals(fs.readFileSync(reference))) {
    return { identical: true, differing: 0, softDiffering: 0, maxDelta: 0 };
  }
  const { default: sharp } = await import('sharp');
  const raw = (source) =>
    sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [now, before] = await Promise.all([raw(nowBytes), raw(reference)]);
  const { width, height } = now.info;
  if (width !== before.info.width || height !== before.info.height) {
    return { identical: false, sizeChanged: true, differing: width * height };
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
  // The largest channel difference between pixel i of `one` and j of `other`.
  const delta = (one, i, other, j) =>
    Math.max(
      Math.abs(one[i] - other[j]),
      Math.abs(one[i + 1] - other[j + 1]),
      Math.abs(one[i + 2] - other[j + 2])
    );
  const isSoft = (x, y) =>
    soft?.bits[
      Math.floor(y / soft.cell) * soft.cols + Math.floor(x / soft.cell)
    ] === '1';
  /** Does pixel i of `one` look like anything near it in `other`? */
  const hasMatchNear = (one, other, i, x, y) => {
    for (let dy = -SOFT_RADIUS; dy <= SOFT_RADIUS; dy++) {
      for (let dx = -SOFT_RADIUS; dx <= SOFT_RADIUS; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (delta(one, i, other, (ny * width + nx) * 4) <= SOFT_DELTA) {
          return true;
        }
      }
    }
    return false;
  };

  // How much of the soft area is one colour, now and in the reference: a map
  // that drew nothing is a flat sheet of its background.
  const softRow = soft
    ? Uint8Array.from({ length: width }, (_, x) => Math.floor(x / soft.cell))
    : null;
  const coloursNow = new Uint32Array(4096);
  const coloursBefore = new Uint32Array(4096);
  const shade = (data, i) =>
    ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
  let softPixels = 0;

  const diff = Buffer.alloc(a.length);
  const tiles = new Map();
  let differing = 0;
  let softDiffering = 0;
  let unequal = 0;
  let maxDelta = 0;
  for (let p = 0, i = 0; p < skip.length; p++, i += 4) {
    const grey = 200 + ((a[i] + a[i + 1] + a[i + 2]) / 3) * 0.2;
    diff[i] = diff[i + 1] = diff[i + 2] = grey;
    diff[i + 3] = 255;
    if (soft && !skip[p]) {
      const x = p % width;
      const row = Math.floor((p - x) / width / soft.cell);
      if (soft.bits[row * soft.cols + softRow[x]] === '1') {
        softPixels++;
        coloursNow[shade(a, i)]++;
        coloursBefore[shade(b, i)]++;
      }
    }
    const off = delta(a, i, b, i);
    if (off === 0 || skip[p]) continue;
    unequal++;
    if (off > maxDelta) maxDelta = off;
    const x = p % width;
    const y = (p - x) / width;
    if (isSoft(x, y)) {
      if (off <= SOFT_DELTA) continue;
      if (hasMatchNear(a, b, i, x, y) && hasMatchNear(b, a, i, x, y)) continue;
      softDiffering++;
    } else {
      if (off <= STRICT_DELTA) continue;
      differing++;
    }
    diff[i] = 255;
    diff[i + 1] = diff[i + 2] = 0;
    const tile = `${Math.floor(x / BOX) * BOX},${Math.floor(y / BOX) * BOX}`;
    tiles.set(tile, (tiles.get(tile) ?? 0) + 1);
  }
  if (differing + softDiffering > 0 && diffFile) {
    await sharp(diff, { raw: { width, height, channels: 4 } })
      .png()
      .toFile(diffFile);
  }
  // Where to look: the screen tiles holding the most differing pixels.
  const boxes = [...tiles]
    .sort((one, other) => other[1] - one[1])
    .slice(0, 10)
    .map(([tile, pixels]) => {
      const [x, y] = tile.split(',').map(Number);
      return { x, y, size: BOX, pixels };
    });
  return {
    identical: false,
    differing,
    softDiffering,
    unequal,
    maxDelta,
    boxes,
    softFlat: softPixels
      ? {
          now: Number((Math.max(...coloursNow) / softPixels).toFixed(3)),
          before: Number((Math.max(...coloursBefore) / softPixels).toFixed(3)),
        }
      : null,
  };
}

/** Baselines are per viewport and font scale: other sizes are other pages. */
const baselineDir = (viewport, fontScale) =>
  path.join(
    BASELINE_DIR,
    fontScale === 1 ? viewport : `${viewport}_fs${fontScale}`
  );

/** What is kept about a page beside its image, to compare the next one with. */
const pageRecord = (entry) => ({
  textHash: entry.textHash,
  text: entry.text,
  status: entry.status,
  finalPath: entry.finalPath,
  httpStatus: entry.httpStatus,
  sameAs: entry.sameAs,
});

/**
 * What captures are compared with: the baseline, or with --against another
 * run's folder. Images are looked up in `dir`, page records in `pages`.
 */
function loadReference(opts, viewport, run) {
  if (!opts.against) {
    const dir = baselineDir(viewport, opts.fontScale);
    const record = readJson(path.join(dir, 'baseline.json'));
    return { dir, pages: record?.pages ?? {}, label: 'baseline' };
  }
  if (opts.against === run) {
    throw new Error('--against names the folder this run writes to.');
  }
  const dir = path.join(SHOTS_DIR, opts.against);
  const results = readJson(path.join(dir, 'results.json'));
  if (!results)
    throw new Error(`No results.json in screenshots/${opts.against}.`);
  if (results.viewport !== viewport) {
    throw new Error(
      `screenshots/${opts.against} was shot at ${results.viewport}; the browser is ${viewport}.`
    );
  }
  return {
    dir,
    pages: Object.fromEntries(
      results.pages.map((p) => [p.page, pageRecord(p)])
    ),
    label: `run ${opts.against}`,
  };
}

/** Judge one image of an entry against the reference; returns the verdict. */
async function judge(entry, image, ctx, regions, settled) {
  const file = path.join(ctx.runDir, image);
  const reference = path.join(ctx.ref.dir, image);
  const result = { verdict: 'new', settled, diffImage: null };
  if (fs.existsSync(reference)) {
    const diffFile = file.replace(/\.png$/, '--diff.png');
    fs.rmSync(diffFile, { force: true });
    const found = await compareImages(file, reference, {
      ...regions,
      diffFile,
    });
    const changed =
      !!found.sizeChanged ||
      found.differing > (entry.tolerance ?? TOLERANCE_PX) ||
      (found.softDiffering ?? 0) > (entry.softTolerance ?? SOFT_TOLERANCE_PX);
    if (!changed) fs.rmSync(diffFile, { force: true });
    Object.assign(result, found, {
      verdict: changed ? 'changed' : 'unchanged',
      diffImage:
        changed && fs.existsSync(diffFile) ? path.basename(diffFile) : null,
    });
  }
  entry.images[image] = result;
  return result.verdict;
}

/** A few words either side of where two texts first part ways. */
function textDiff(before, after) {
  let at = 0;
  while (at < before.length && at < after.length && before[at] === after[at]) {
    at++;
  }
  const from = Math.max(0, at - 30);
  return {
    before: before.slice(from, at + 50),
    after: after.slice(from, at + 50),
  };
}

// How many times a capture that does not read unchanged is taken in all.
const ATTEMPTS = 3;

// A map area this much one colour, where the reference's was not, drew nothing.
const FLAT_SHARE = 0.9;

const WORST = { changed: 3, missing: 3, new: 2, unchanged: 1 };
const worst = (verdicts) =>
  verdicts
    .filter(Boolean)
    .map((v) => (v === 'missing' ? 'changed' : v))
    .sort((one, other) => WORST[other] - WORST[one])[0] ?? 'new';

/**
 * Make a run's new and changed captures the baseline. A capture that cannot
 * be trusted (unsettled, failed, role unchecked, batch cut short, build not
 * current) is left out unless --force. Every replaced file is kept under
 * .history first.
 */
function acceptRun(opts) {
  const runDir = path.join(SHOTS_DIR, opts.accept);
  const results = readJson(path.join(runDir, 'results.json'));
  if (!results) {
    console.error(`No results.json in screenshots/${opts.accept}.`);
    return 1;
  }
  if (results.pages.some((p) => !p.images)) {
    console.error('That run was shot by an older runner: shoot it again.');
    return 1;
  }
  const target = baselineDir(results.viewport, results.fontScale ?? 1);
  const recordFile = path.join(target, 'baseline.json');
  const record = readJson(recordFile) ?? { pages: {} };
  const history = path.join(target, '.history', timestamp(new Date()));
  const retire = (name) => {
    const file = path.join(target, name);
    if (!fs.existsSync(file)) return false;
    fs.mkdirSync(history, { recursive: true });
    fs.renameSync(file, path.join(history, name));
    return true;
  };
  if (fs.existsSync(recordFile)) {
    fs.mkdirSync(history, { recursive: true });
    fs.copyFileSync(recordFile, path.join(history, 'baseline.json'));
  }

  const wanted = new Set(opts.acceptNames);
  const left = [];
  let copied = 0;
  let retired = 0;
  let accepted = 0;
  fs.mkdirSync(target, { recursive: true });
  for (const entry of results.pages) {
    if (wanted.size && !wanted.has(entry.page)) continue;
    wanted.delete(entry.page);
    const batch = results.batches?.[entry.batch];
    const doubts = [
      !entry.settled && 'not settled',
      entry.changed === 'unsure' && 'not judged',
      !['ok', 'redirected'].includes(entry.status) && entry.status,
      !batch?.complete && 'batch cut short',
      !batch?.asVerified && 'role not checked',
      batch?.build?.state !== 'current' && `build ${batch?.build?.state}`,
    ].filter(Boolean);
    if (doubts.length && !opts.force) {
      left.push(`${entry.page}: ${doubts.join(', ')}`);
      continue;
    }
    for (const [image, info] of Object.entries(entry.images)) {
      if (info.verdict === 'missing') {
        if (retire(image)) retired++;
        continue;
      }
      const from = path.join(runDir, image);
      const to = path.join(target, image);
      // Judged against the baseline, "unchanged" means leave it be: copying
      // would let the baseline creep by whatever the tolerance let through.
      const take = !fs.existsSync(to)
        ? true
        : batch?.against
          ? !fs.readFileSync(from).equals(fs.readFileSync(to))
          : info.verdict !== 'unchanged';
      if (!take) continue;
      retire(image);
      fs.copyFileSync(from, to);
      copied++;
    }
    // Now the same screen as another page: its own old image no longer holds.
    if (!entry.image) {
      for (const old of [`${entry.page}.png`, `${entry.page}--scrolled.png`]) {
        if (retire(old)) retired++;
      }
    }
    record.pages[entry.page] = {
      ...pageRecord(entry),
      role: entry.as,
      run: results.run,
      commit: batch?.build?.commit ?? null,
      browser: batch?.browser ?? results.browser,
      acceptedAt: new Date().toISOString(),
    };
    accepted++;
  }
  if (wanted.size) {
    console.error(`Not in that run: ${[...wanted].join(', ')}`);
    return 1;
  }
  writeJson(recordFile, record);
  console.log(
    `${accepted} captures accepted into ${target}: ${copied} images copied, ${retired} retired.`
  );
  if (fs.existsSync(history)) console.log(`What they replaced: ${history}`);
  for (const line of left) console.log(`Left out (use --force): ${line}`);
  return 0;
}

// ----------------------------------------------------------------- shoot

/** A results entry for a target, before anything is known about it. */
const blankEntry = (target, ctx) => ({
  page: target.name,
  kind: target.steps ? 'state' : 'page',
  group: target.group ?? null,
  path: redact(target.path),
  as: ctx.as,
  batch: ctx.batch,
  status: 'ok',
  httpStatus: null,
  finalPath: null,
  waitedSeconds: 0,
  waited: null,
  settled: false,
  image: null,
  scrollImage: null,
  images: {},
  sameAs: null,
  changed: null,
  changedBecause: [],
  map: null,
  mapTiles: null,
  mapView: null,
  unsureBecause: [],
  textChanged: null,
  tolerance: target.tolerance ?? null,
  softTolerance: target.softTolerance ?? null,
  text: '',
  textHash: null,
  externalHosts: [],
  failedRequests: [],
  mapFailedRequests: [],
  backendFailedRequests: [],
  writeRequests: [],
  blockedRequests: [],
  hostedBackend: null,
  pageErrors: [],
  consoleErrors: [],
  error: null,
});

async function shoot(page, context, target, ctx) {
  const url = new URL(target.path, ctx.base);
  const entry = blankEntry(target, ctx);
  let crashed = false;
  let network = null;
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

  const started = Date.now();
  try {
    network = await watchNetwork(page, context);
    // Wherever the last page's steps left the pointer, its hover styles
    // would otherwise show up here.
    await page.mouse.move(0, 0);
    const response = await page.goto(url.href, {
      waitUntil: 'domcontentloaded',
      timeout: ctx.timeoutMs,
    });
    entry.httpStatus = response?.status() ?? null;
    let rest = await settle(page, network, ctx.timeoutMs, target.still);
    if (target.steps) {
      try {
        await withWritesGuarded(page, entry.blockedRequests, () =>
          runSteps(page, target.steps)
        );
      } catch (err) {
        entry.status = 'state-error';
        entry.error = redact(err.message);
      }
      rest = await settle(page, network, ctx.timeoutMs, target.still);
    }
    const { shot, settled } = rest;
    const text = maskText(rest.text);
    const maps = [rest.map];
    entry.settled = settled;
    entry.waited = rest.spent;
    entry.text = redact(text).slice(0, TEXT_LIMIT);
    entry.textHash = text ? sha256(text) : null;

    if (crashed) throw new Error('The page crashed.');
    const final = new URL(page.url());
    entry.finalPath = redact(final.pathname + final.search);
    if (entry.status === 'ok') {
      if (final.origin !== ctx.base.origin) entry.status = 'left-app';
      else if (!text) entry.status = 'blank';
      else if ((entry.httpStatus ?? 0) >= 500) entry.status = 'http-error';
      else if (final.pathname !== url.pathname) entry.status = 'redirected';
    }
    if (!settled) {
      entry.error ??= `Still waiting on ${rest.waitingOn} after ${ctx.timeoutMs / 1000} s.`;
    }

    const verdicts = [];
    const known = ctx.ref.pages[target.name];
    if (known) {
      if (known.textHash !== entry.textHash) {
        entry.changedBecause.push('text');
        entry.textChanged = textDiff(known.text ?? '', entry.text);
      }
      for (const field of ['status', 'finalPath', 'httpStatus']) {
        if (known[field] !== entry[field]) {
          entry.changedBecause.push(`${field} was ${known[field]}`);
        }
      }
      verdicts.push(entry.changedBecause.length ? 'changed' : 'unchanged');
    }

    // The same text as an earlier page of this batch means the same screen,
    // which is how a redirect or a default tab shows. It saves an image only
    // when this page has none of its own to be compared with: a page that
    // used to be its own screen and now shows another's has changed, and
    // must not borrow the other's verdict.
    const twin =
      entry.kind === 'page' &&
      settled &&
      ctx.entries.find(
        (e) =>
          e.batch === ctx.batch &&
          e.image &&
          e.kind === 'page' &&
          e.textHash === entry.textHash
      );
    const ownImage = fs.existsSync(
      path.join(ctx.ref.dir, `${target.name}.png`)
    );
    if (twin) entry.sameAs = twin.page;
    if (twin && !ownImage) {
      if (known && known.sameAs !== twin.page) {
        entry.changedBecause.push(`was the same screen as ${known.sameAs}`);
        verdicts.push('changed');
      } else {
        verdicts.push(known ? 'unchanged' : 'new');
      }
    } else {
      if (twin)
        entry.changedBecause.push(`now the same screen as ${twin.page}`);
      entry.image = `${target.name}.png`;
      await capture(page, path.join(ctx.runDir, entry.image), shot);
      verdicts.push(
        await judge(
          entry,
          entry.image,
          ctx,
          await regionsOf(page, target),
          settled
        )
      );

      const scrolledName = `${target.name}--scrolled.png`;
      if (ctx.scroll && entry.kind === 'page') {
        if (await scrollOnce(page)) {
          const below = await settle(
            page,
            network,
            ctx.timeoutMs,
            target.still
          );
          entry.scrollImage = scrolledName;
          entry.settled &&= below.settled;
          maps.push(below.map);
          await capture(page, path.join(ctx.runDir, scrolledName), below.shot);
          verdicts.push(
            await judge(
              entry,
              scrolledName,
              ctx,
              await regionsOf(page, target),
              below.settled
            )
          );
        } else if (fs.existsSync(path.join(ctx.ref.dir, scrolledName))) {
          // It scrolled when the reference was shot and does not now.
          entry.images[scrolledName] = { verdict: 'missing', settled: true };
          entry.changedBecause.push('no longer scrolls');
          verdicts.push('missing');
        }
      }
    }
    if (Object.values(entry.images).some((i) => i.verdict === 'changed')) {
      entry.changedBecause.push('pixels');
    }
    entry.changed = worst(verdicts);

    // A map that did not finish drawing, or a backend that failed, says
    // nothing about the app: the capture is neither changed nor new.
    const states = maps.filter(Boolean);
    if (states.length) {
      entry.map =
        ['loading', 'unreadable'].find((state) =>
          states.some((m) => m.state === state)
        ) ?? 'loaded';
      entry.mapTiles = states.map((m) => m.tiles);
      entry.mapView = states[0].view;
      if (entry.map === 'loading') {
        entry.unsureBecause.push('the map had not finished loading');
      }
      const errored = Math.max(...states.map((m) => m.errored));
      if (errored) entry.unsureBecause.push(`${errored} map tiles failed`);
      if (network.mapFailed().length) {
        entry.unsureBecause.push(
          `${network.mapFailed().length} map requests failed`
        );
      }
      const flat = Object.values(entry.images).some(
        (i) => i.softFlat?.now >= FLAT_SHARE && i.softFlat.before < FLAT_SHARE
      );
      if (flat) entry.unsureBecause.push('the map area is blank');
    }
    if (network.backendFailed().length) {
      entry.unsureBecause.push(
        `the backend failed: ${network.backendFailed().join(', ')}`
      );
    }
    // Unchanged is still unchanged: whatever went wrong went wrong the same
    // way when the reference was shot.
    if (entry.unsureBecause.length && entry.changed !== 'unchanged') {
      entry.changed = 'unsure';
    }
  } catch (err) {
    entry.status = crashed ? 'crashed' : 'error';
    entry.error = redact(err.message.split('\n')[0]);
  } finally {
    entry.waitedSeconds = Number(((Date.now() - started) / 1000).toFixed(1));
    if (network) {
      entry.externalHosts = network.hosts();
      entry.failedRequests = network.failed();
      entry.mapFailedRequests = network.mapFailed();
      entry.backendFailedRequests = network.backendFailed();
      entry.writeRequests = network.writes();
      entry.hostedBackend = network.hostedBackend();
      await network.stop();
    }
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
 * out and why.
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
  const width = Number(viewport.split('x')[0]);
  const sizeNames = Object.entries(VIEWPORTS)
    .filter(([, size]) => size.join('x') === viewport)
    .map(([name]) => name);

  // With a role in the name (map-profile@staff) or without.
  const only = opts.only.map((name) => name.replace(/@[a-z]+$/, ''));
  const missing = only.filter(
    (name) => ![...pages, ...states].some((e) => e.name === name)
  );
  if (missing.length) {
    throw new Error(`Not in the manifest: ${missing.join(', ')}.`);
  }
  const wanted = (entry) =>
    only.length
      ? only.includes(entry.name)
      : opts.states || !states.includes(entry);
  for (const entry of [...pages, ...states].filter(wanted)) {
    if (!opts.groups.includes('all') && !opts.groups.includes(entry.group)) {
      continue;
    }
    const skip = (reason) => skipped.push({ page: entry.name, reason });
    if (entry.param) skip(`needs seed data: ${entry.param}`);
    else if (entry.mutates) skip('changes data; never run');
    else if (
      entry.viewports &&
      !entry.viewports.some((v) => v === viewport || sizeNames.includes(v))
    ) {
      skip(`only at ${entry.viewports.join(', ')}`);
    } else if (entry.minWidth && width < entry.minWidth) {
      skip(`only from ${entry.minWidth} px wide`);
    } else if (entry.maxWidth && width > entry.maxWidth) {
      skip(`only up to ${entry.maxWidth} px wide`);
    } else if (entry.needs && roleRank(opts.as) < roleRank(entry.needs)) {
      skip(`gated: needs ${entry.needs}`);
    } else {
      targets.push(pageSpec({ ...manifest.defaults, ...entry }));
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
    supabaseUrl: null,
    backendUrl: null,
    anonKey: false,
    mapboxToken: false,
  };
  if (!settings.present) return settings;
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

/**
 * The app source as it stands: the commit (for display) and a fingerprint of
 * its content. The fingerprint is what git has for every tracked file plus a
 * hash of each modified or untracked one, so an edit counts wherever it is,
 * a brand-new folder included.
 */
function sourceState() {
  const git = (args, input) =>
    execFileSync('git', args, {
      cwd: ROOT,
      encoding: 'utf8',
      input,
      maxBuffer: 64 * 1024 * 1024,
    });
  try {
    const tracked = git(['ls-files', '-s', '-z', '--', ...APP_SOURCE]);
    const loose = git([
      'ls-files',
      '-m',
      '-o',
      '--exclude-standard',
      '-z',
      '--',
      ...APP_SOURCE,
    ])
      .split('\0')
      .filter(Boolean);
    const present = loose.filter((name) =>
      fs.existsSync(path.join(ROOT, name))
    );
    const hashes = present.length
      ? git(['hash-object', '--stdin-paths'], present.join('\n'))
      : '';
    return {
      commit: git(['rev-parse', 'HEAD']).trim(),
      dirty: loose.length > 0,
      fingerprint: sha256(tracked + loose.join('\n') + hashes),
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

const envOrigins = () => {
  const settings = readSettings();
  return {
    supabaseOrigin: settings.supabaseUrl?.origin ?? null,
    backendOrigin: settings.backendUrl?.origin ?? null,
  };
};

/**
 * `pnpm shots:build` runs this before the build (--begin) and after it. The
 * stamp is written only when the source did not move in between and the
 * build really is a new one, so a stamp always describes the build it sits
 * beside. NEXT_PUBLIC_ values are fixed at build time, so it keeps them too.
 */
function stampBuild(opts) {
  const source = sourceState();
  if (!source) {
    console.error('git did not answer.');
    return 1;
  }
  if (opts.begin) {
    writeJson(BUILD_BEGIN, { ...source, ...envOrigins(), buildId: buildId() });
    return 0;
  }
  const begin = readJson(BUILD_BEGIN);
  fs.rmSync(BUILD_BEGIN, { force: true });
  const id = buildId();
  const refuse = !begin
    ? 'no build was started by pnpm shots:build'
    : !id || id === begin.buildId
      ? 'the build did not produce a new build id'
      : begin.fingerprint !== source.fingerprint
        ? 'app source changed while the build ran'
        : JSON.stringify(envOrigins()) !==
            JSON.stringify({
              supabaseOrigin: begin.supabaseOrigin,
              backendOrigin: begin.backendOrigin,
            })
          ? '.env.local changed while the build ran'
          : null;
  if (refuse) {
    fs.rmSync(BUILD_STAMP, { force: true });
    console.error(`Not stamped: ${refuse}. Run pnpm shots:build again.`);
    return 1;
  }
  writeJson(BUILD_STAMP, {
    buildId: id,
    stampedAt: new Date().toISOString(),
    ...source,
    ...envOrigins(),
  });
  console.log(
    `Stamped build ${id}: commit ${source.commit.slice(0, 7)}` +
      (source.dirty ? ' plus uncommitted changes.' : '.')
  );
  return 0;
}

/**
 * What the app answering at `base` was built from, and whether the source
 * has moved since: { served, stamp, state: current|stale|unknown|n/a, detail }.
 */
async function buildState(base) {
  const id = buildId();
  const manifest = id && new URL(`/_next/static/${id}/_buildManifest.js`, base);
  const served = !!id && (await httpGet(manifest.href, 5000))?.status === 200;
  if (!served) {
    return {
      served,
      stamp: null,
      state: 'n/a',
      detail:
        'not the build in .next: a dev server, or a server started before the last build (restart it)',
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
  const env = envOrigins();
  const detail =
    now.fingerprint !== stamp.fingerprint
      ? now.commit !== stamp.commit
        ? `built from ${short(stamp.commit)}, the source is at ${short(now.commit)}`
        : 'app source has changed since the build'
      : env.supabaseOrigin !== stamp.supabaseOrigin ||
          env.backendOrigin !== stamp.backendOrigin
        ? '.env.local names other servers than the build has: rebuild to apply it'
        : null;
  return detail
    ? { served, stamp, state: 'stale', detail }
    : {
        served,
        stamp,
        state: 'current',
        detail: `built from ${short(stamp.commit)}${stamp.dirty ? ' plus the same uncommitted changes' : ''}`,
      };
}

/**
 * The Supabase the running app talks to, read from the app itself: its
 * content security policy lists the one origin it may call over both http
 * and ws (next.config.ts). A file on disk only says what some build was
 * given. Null when the app sends no such policy.
 */
function supabaseOf(headers) {
  const policy =
    headers?.get('content-security-policy') ??
    headers?.get('content-security-policy-report-only') ??
    '';
  const connect = policy
    .split(';')
    .map((part) => part.trim().split(/\s+/))
    .find((words) => words[0] === 'connect-src');
  for (const word of connect?.slice(1) ?? []) {
    if (!/^https?:\/\//.test(word)) continue;
    if (connect.includes(word.replace(/^http/, 'ws'))) {
      try {
        return new URL(word);
      } catch {
        // Not an origin after all.
      }
    }
  }
  return null;
}

/**
 * Who is signed in, without touching a credential: the role in the profile
 * the app itself fetches as a page loads, and whether the browser's storage
 * holds a Supabase session entry (its name only, never what is in it).
 * Returns { role }: 'citizen', 'staff' or 'admin'; 'guest' only when nothing
 * was asked for, nothing is stored and the page settled; otherwise 'unknown'
 * with a reason, which stops a batch.
 */
async function observeRole(page, context, base, supabase, timeoutMs) {
  let role = null;
  let asked = false;
  const prefix = new URL('/rest/v1/profiles', supabase).href;
  const onRequest = (request) => {
    if (request.url().startsWith(prefix)) asked = true;
  };
  const onResponse = async (response) => {
    if (!response.url().startsWith(prefix) || !response.ok()) return;
    const body = await response.json().catch(() => null);
    const row = Array.isArray(body) ? body[0] : body;
    if (typeof row?.role === 'string') role = row.role;
  };
  page.on('request', onRequest);
  page.on('response', onResponse);
  const network = await watchNetwork(page, context);
  let rest;
  let stored = null;
  try {
    await page.goto(new URL(ROLE_PROBE, base).href, {
      waitUntil: 'domcontentloaded',
      timeout: timeoutMs,
    });
    rest = await settle(page, network, Math.min(timeoutMs, 10000));
    stored = await page
      .evaluate(() =>
        Object.keys(localStorage).some((key) => /^sb-.*-auth-token/.test(key))
      )
      .catch(() => null);
  } finally {
    await network.stop();
    page.off('request', onRequest);
    page.off('response', onResponse);
  }
  if (role) return { role, text: rest.text };
  if (!asked && stored === false && rest.settled) {
    return { role: 'guest', text: rest.text };
  }
  return {
    role: 'unknown',
    text: rest.text,
    reason: stored
      ? 'a session is stored but no profile came back'
      : asked
        ? 'the profile request did not succeed'
        : !rest.settled
          ? 'the probe page did not settle'
          : 'the browser storage could not be read',
  };
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
      const files = Object.entries(p.images ?? {}).flatMap(([file, info]) =>
        info.verdict === 'missing' ? [] : [file, info.diffImage]
      );
      const images = files
        .filter(Boolean)
        .map(
          (file) =>
            `<a href="${escapeHtml(file)}"><img loading="lazy" src="${escapeHtml(file)}" alt=""></a>`
        )
        .join('');
      const pixels = Object.values(p.images ?? {}).reduce(
        (sum, info) => sum + (info.differing ?? 0) + (info.softDiffering ?? 0),
        0
      );
      const notes = [
        p.kind === 'state' && 'state',
        p.status,
        p.changed,
        p.changedBecause?.length && `because: ${p.changedBecause.join('; ')}`,
        pixels > 0 && `${pixels} px differ`,
        `as ${p.as}`,
        p.httpStatus && `HTTP ${p.httpStatus}`,
        `${p.waitedSeconds} s`,
        !p.settled && 'NOT SETTLED',
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
  const last = results.batches.at(-1);
  return `<!doctype html>
<meta charset="utf-8">
<title>Shots ${escapeHtml(results.run)}</title>
<style>
body{font:13px system-ui,sans-serif;margin:16px;background:#f4f4f4;color:#222}
main{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
figure{margin:0;padding:8px;background:#fff;border:1px solid #ddd;border-top:4px solid #bbb}
figure.changed{border-top-color:#d97706}figure.new{border-top-color:#2563eb}figure.unsure{border-top-color:#7c3aed}
img{width:100%;border:1px solid #eee;margin-bottom:4px}
.none{padding:32px 0;text-align:center;color:#888}
code{word-break:break-all}
</style>
<h1>${escapeHtml(results.run)}${results.complete ? '' : ' (INCOMPLETE)'}</h1>
<p>${escapeHtml(results.baseUrl)} · ${escapeHtml(results.viewport)} · font scale ${escapeHtml(results.fontScale)} · build ${escapeHtml(last?.build?.state)} · compared with ${escapeHtml(last?.reference)} · ${results.pages.length} captures · orange changed, blue new, grey unchanged</p>
<main>
${cards}
</main>
${skipped ? `<h2>Not shot</h2><ul>${skipped}</ul>` : ''}
`;
}

function saveRun(runDir, results) {
  results.complete = results.batches.every((batch) => batch.complete);
  writeJson(path.join(runDir, 'results.json'), results);
  fs.writeFileSync(path.join(runDir, 'index.html'), contactSheet(results));
}

async function runBatch(opts) {
  const info = await browserInfo();
  if (!info?.ours) {
    console.error(info ? NOT_OURS : `No browser attached at ${CDP_URL}.`);
    if (!info) console.error('Start one: pnpm shots --start-browser');
    return 1;
  }
  if (!isLocal(opts.base) && !opts.allowHosted) {
    console.error(`Refusing to run: ${opts.base.origin} is not this machine.`);
    console.error('--allow-hosted overrides this.');
    return 1;
  }
  const app = await httpGet(opts.base.href);
  if (!app) {
    console.error(`Nothing answers at ${opts.base.origin}.`);
    console.error('See docs/guides/DEVICE_TESTING.md for starting the app.');
    return 1;
  }
  // The same line the other scripts here draw: pages shot signed in can be
  // real people's reports and profiles.
  const supabase = supabaseOf(app.headers);
  if (!opts.allowHosted && !(supabase && isLocal(supabase))) {
    console.error(
      `Refusing to run: the app at ${opts.base.origin} ${
        supabase
          ? `talks to ${supabase.origin}, not the local stack`
          : 'does not say which Supabase it talks to'
      }.`
    );
    console.error('--allow-hosted overrides this.');
    return 1;
  }
  const build = await buildState(opts.base);
  console.log(`Build: ${build.state.toUpperCase()} (${build.detail}).`);
  if (build.state !== 'current' && !opts.allowStale) {
    console.error(
      'Refusing to run: pictures of another build answer the wrong question.'
    );
    console.error('pnpm shots:build and restart the server, or --allow-stale.');
    return 1;
  }

  let { browser, context, page } = await attach();
  let cdp = null;
  let interrupted = false;
  let code = 0;

  // What makes runs comparable. A browser has no status bar or clock to pin;
  // what moves between two captures of one page is animation, so motion is
  // turned off (and screenshot.mjs freezes what is left at capture time).
  // The font size is always set, 1 included, so a run killed while it was
  // scaled is put right by the next one.
  const prepare = async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    cdp = await context.newCDPSession(page);
    await cdp.send('Page.setFontSizes', {
      fontSizes: {
        standard: Math.round(16 * opts.fontScale),
        fixed: Math.round(13 * opts.fontScale),
      },
    });
  };
  const restore = async () => {
    await page.emulateMedia({ reducedMotion: null }).catch(() => {});
    if (!cdp) return;
    await cdp
      .send('Page.setFontSizes', { fontSizes: { standard: 16, fixed: 13 } })
      .catch(() => {});
    await cdp.detach().catch(() => {});
    cdp = null;
    // The page still on screen was laid out with the larger font.
    if (opts.fontScale !== 1) {
      await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    }
  };
  // Once: finish the page in hand, then stop. Twice: stop now.
  const onInterrupt = () => {
    if (interrupted) restore().finally(() => process.exit(1));
    interrupted = true;
  };
  process.on('SIGINT', onInterrupt);

  try {
    const viewport = await viewportOf(page);
    const { targets, skipped } = fromManifest(opts, viewport);
    // Pages named on the command line get the manifest's defaults too.
    const defaults = readJson(MANIFEST)?.defaults ?? {};
    targets.push(...opts.pages.map((p) => ({ ...defaults, ...p })));
    // Signed in, every name carries the role, however the page was named,
    // so one role's capture can never be compared with, or replace,
    // another's.
    const suffix = opts.as === 'guest' ? '' : `@${opts.as}`;
    const named = (name) => (name.endsWith(suffix) ? name : name + suffix);
    for (const target of targets) target.name = named(target.name);
    for (const row of skipped) row.page = named(row.page);
    const names = targets.map((t) => t.name);
    const repeated = names.find((name, i) => names.indexOf(name) !== i);
    if (repeated) throw new Error(`Two captures are named "${repeated}".`);
    if (targets.length === 0) throw new Error('Nothing to shoot.');

    const started = new Date();
    const run = opts.run ?? `${timestamp(started)}_${viewport}`;
    const runDir = path.join(SHOTS_DIR, run);
    const earlier = readJson(path.join(runDir, 'results.json'));
    for (const [what, now] of [
      ['viewport', viewport],
      ['fontScale', opts.fontScale],
      ['baseUrl', opts.base.origin],
    ]) {
      if (earlier && earlier[what] !== now) {
        throw new Error(
          `screenshots/${run} was shot with ${what} ${earlier[what]}; this run has ${now}.`
        );
      }
    }
    if (earlier && !earlier.batches) {
      throw new Error(`screenshots/${run} was shot by an older runner.`);
    }
    const ref = loadReference(opts, viewport, run);

    if (opts.clear) {
      // Only now, with everything else checked: a mistyped group must not
      // cost the session. Once per batch, never per page.
      await clearSession(context, page, opts.base);
    }
    await prepare();

    // --as is a claim; check it before a whole batch is shot as the wrong
    // user, and stop when it cannot be checked.
    const seen = await observeRole(
      page,
      context,
      opts.base,
      supabase ?? opts.base,
      opts.timeout * 1000
    );
    if (seen.role !== opts.as) {
      console.error(
        seen.role === 'unknown'
          ? `Cannot tell who is signed in: ${seen.reason}. pnpm shots --clear signs the browser out.`
          : `--as ${opts.as}, but the browser is ${seen.role === 'guest' ? 'signed out' : `signed in as ${seen.role}`}.`
      );
      return 1;
    }

    const batch = {
      startedAt: started.toISOString(),
      finishedAt: null,
      complete: false,
      interrupted: false,
      as: opts.as,
      asVerified: true,
      planned: names,
      reference: ref.label,
      against: opts.against,
      build: {
        state: build.state,
        detail: build.detail,
        commit: build.stamp?.commit ?? null,
      },
      browser: info.version,
      supabase: supabase?.origin ?? null,
    };
    const results = {
      run,
      startedAt: earlier?.startedAt ?? started.toISOString(),
      finishedAt: null,
      complete: false,
      baseUrl: opts.base.origin,
      viewport,
      fontScale: opts.fontScale,
      batches: [...(earlier?.batches ?? []), batch],
      pages: (earlier?.pages ?? []).filter((p) => !names.includes(p.page)),
      skipped: [
        ...(earlier?.skipped ?? []).filter(
          (s) =>
            !names.includes(s.page) && !skipped.some((n) => n.page === s.page)
        ),
        ...skipped,
      ],
    };
    const ctx = {
      base: opts.base,
      as: opts.as,
      batch: results.batches.length - 1,
      runDir,
      ref,
      scroll: opts.scroll,
      timeoutMs: opts.timeout * 1000,
      entries: results.pages,
    };
    // Before the first page: a run killed from here on must not look done.
    saveRun(runDir, results);

    // One capture, bounded: up to three settles (the page, after its steps,
    // after a scroll) and room to spare. A tab that crashed or stopped
    // answering cannot be reused, so the next capture gets a new one.
    const deadlineMs = ctx.timeoutMs * 3 + 30000;
    let hungInARow = 0;
    const attempt = async (target) => {
      let entry = await withDeadline(
        shoot(page, context, target, ctx),
        deadlineMs
      );
      hungInARow = entry === HUNG ? hungInARow + 1 : 0;
      if (entry === HUNG) {
        entry = {
          ...blankEntry(target, ctx),
          status: 'error',
          error: `No answer from the page within ${deadlineMs / 1000} s.`,
          waitedSeconds: deadlineMs / 1000,
        };
      }
      if (entry.status === 'crashed' || entry.error?.startsWith('No answer')) {
        const old = page;
        // Bounded too: a frozen browser never answers this either.
        const fresh = await withDeadline(context.newPage(), 15000);
        if (fresh === HUNG) {
          hungInARow = 2;
          return entry;
        }
        page = fresh;
        cdp = null;
        await prepare();
        old.close().catch(() => {});
      }
      return entry;
    };

    // Two captures in a row without an answer is the browser, not the page.
    // It is restarted once (the session is in its profile, so it survives);
    // a second freeze ends the batch.
    const restartBrowser = async () => {
      console.error('The browser stopped answering: restarting it once.');
      await withDeadline(browser.close(), 5000);
      if ((await stopBrowser()) !== 0) return false;
      if ((await startBrowser({ viewport, headed: false })) !== 0) return false;
      ({ browser, context, page } = await attach());
      cdp = null;
      await prepare();
      if ((await viewportOf(page)) !== viewport) return false;
      batch.browserRestarted = true;
      hungInARow = 0;
      return true;
    };

    const rows = [];
    let hosted = null;
    let frozen = false;
    let appGone = false;
    let refused = 0;
    for (let at = 0; at < targets.length; at++) {
      const target = targets[at];
      if (interrupted) break;
      let entry = await attempt(target);
      if (hungInARow >= 2) {
        const headed = !info.version.includes('Headless');
        if (batch.browserRestarted || headed || !(await restartBrowser())) {
          results.pages.push(entry);
          frozen = true;
          break;
        }
        // Again from the capture before this one: it was the first to hang.
        if (at > 0 && results.pages.at(-1)?.page === targets[at - 1].name) {
          results.pages.pop();
          rows.pop();
          at--;
        }
        at--;
        continue;
      }
      // Shoot it again before believing it. A change in the app is there on
      // every load; a map caught half drawn, a request that failed once, or
      // the map area landing a pixel to one side (it starts at a fraction of
      // a pixel here, and the browser rounds it either way) is not. So one
      // capture that matches the reference settles it, and a change has to
      // show on every attempt. The last attempt gets a new tab: the rounding
      // tends to stick to a tab.
      const earlier = [];
      while (
        ['changed', 'unsure'].includes(entry.changed) &&
        !FAILED.includes(entry.status) &&
        earlier.length < ATTEMPTS - 1 &&
        hungInARow === 0 &&
        !interrupted
      ) {
        // Kept aside, so that a capture a later one disagrees with can
        // still be looked at.
        const aside = [];
        for (const [image, info] of Object.entries(entry.images)) {
          for (const name of [image, info.diffImage].filter(Boolean)) {
            const from = path.join(runDir, name);
            if (!fs.existsSync(from)) continue;
            const kept = name.replace(
              /\.png$/,
              `--attempt${earlier.length + 1}.png`
            );
            fs.renameSync(from, path.join(runDir, kept));
            aside.push(kept);
          }
        }
        earlier.push({
          changed: entry.changed,
          changedBecause: entry.changedBecause,
          unsureBecause: entry.unsureBecause,
          textChanged: entry.textChanged,
          map: entry.map,
          mapTiles: entry.mapTiles,
          waited: entry.waited,
          images: aside,
          counts: Object.fromEntries(
            Object.entries(entry.images).map(([image, info]) => [
              image,
              {
                differing: info.differing,
                softDiffering: info.softDiffering,
                maxDelta: info.maxDelta,
                boxes: info.boxes,
              },
            ])
          ),
        });
        if (earlier.length === ATTEMPTS - 1) {
          const old = page;
          const fresh = await withDeadline(context.newPage(), 15000);
          if (fresh !== HUNG) {
            page = fresh;
            cdp = null;
            await prepare();
            old.close().catch(() => {});
          }
        }
        entry = await attempt(target);
      }
      if (earlier.length) {
        entry.retried = true;
        for (const tried of earlier) {
          if (tried.changed !== entry.changed) continue;
          for (const kept of tried.images.splice(0)) {
            fs.rmSync(path.join(runDir, kept), { force: true });
          }
        }
        entry.earlierAttempts = earlier;
      }
      results.pages.push(entry);
      results.finishedAt = new Date().toISOString();
      saveRun(runDir, results);
      rows.push([
        entry.page,
        entry.status,
        entry.changed ?? '-',
        entry.sameAs ? `same as ${entry.sameAs}` : '',
        `${entry.waitedSeconds} s`,
        [
          entry.changedBecause.join('; '),
          entry.unsureBecause.join('; '),
          entry.map === 'unreadable' && 'map state unreadable',
          entry.retried &&
            (entry.earlierAttempts.every((t) => t.changed === entry.changed)
              ? `the same on all ${entry.earlierAttempts.length + 1} captures`
              : `earlier captures read ${entry.earlierAttempts.map((t) => t.changed).join(', ')}`),
          entry.error,
        ]
          .filter(Boolean)
          .join(' | '),
      ]);
      console.log(`${entry.page}: ${entry.status}`);
      // Two refusals in a row: the app has gone, and so has every page left.
      refused = entry.error?.includes('ERR_CONNECTION_REFUSED')
        ? refused + 1
        : 0;
      if (refused >= 2) {
        appGone = true;
        break;
      }
      if (entry.hostedBackend && !opts.allowHosted) {
        hosted = entry.hostedBackend;
        break;
      }
    }
    const shot = results.pages.filter((p) => p.batch === ctx.batch);
    batch.finishedAt = new Date().toISOString();
    batch.interrupted = interrupted || !!hosted || frozen || appGone;
    batch.complete = !batch.interrupted && shot.length === names.length;
    saveRun(runDir, results);

    console.log('');
    printTable(
      ['Capture', 'Status', `Against ${ref.label}`, '', 'Took', 'Note'],
      rows
    );
    for (const { page: name, reason } of skipped) {
      console.log(`Not shot: ${name} (${reason})`);
    }
    const unscrolled =
      !opts.scroll &&
      fs.existsSync(ref.dir) &&
      names.filter((name) =>
        fs.existsSync(path.join(ref.dir, `${name}--scrolled.png`))
      ).length;
    if (unscrolled) {
      console.log(
        `Not compared: ${unscrolled} scrolled captures in the ${ref.label} (no --scroll).`
      );
    }
    console.log('');
    console.log(`Build:   ${build.state.toUpperCase()} (${build.detail})`);
    console.log(`Results: ${path.join(runDir, 'results.json')}`);
    console.log(`Sheet:   ${path.join(runDir, 'index.html')}`);
    const failed = shot.filter((p) => FAILED.includes(p.status));
    if (hosted) {
      console.error(
        `Stopped: a page called a Supabase that is not local (${hosted}).`
      );
    }
    if (interrupted) console.error('Interrupted: the rest were not shot.');
    if (appGone) {
      console.error(
        `Stopped: nothing answers at ${opts.base.origin} any more. The rest were not shot.`
      );
    }
    if (frozen) {
      console.error(
        'Stopped: the browser stopped answering. pnpm shots --stop-browser ends it.'
      );
    }
    const unsure = shot.filter((p) => p.changed === 'unsure');
    if (unsure.length) {
      console.log(
        `Not judged: ${unsure.map((p) => p.page).join(', ')}. Shoot them again: --only ${unsure.map((p) => p.page).join(',')}`
      );
    }
    if (failed.length) {
      console.error(`Failed: ${failed.map((p) => p.page).join(', ')}`);
    }
    code = batch.complete && failed.length === 0 ? 0 : 1;
    return code;
  } finally {
    process.off('SIGINT', onInterrupt);
    await withDeadline(restore(), 10000);
    await withDeadline(browser.close(), 5000);
    if (opts.stopAfter) await stopBrowser();
  }
}

/** `pnpm shots --clear` with nothing to shoot: sign the browser out. */
async function clearOnly(opts) {
  const { browser, context, page } = await attach();
  try {
    const cleared = await clearSession(context, page, opts.base);
    console.log(
      `Signed out: cleared cookies and storage for ${cleared.join(' and ')}.`
    );
    return 0;
  } finally {
    await browser.close().catch(() => {});
  }
}

// ------------------------------------------------------------- preflight

async function preflight(opts) {
  const rows = [];
  const info = await browserInfo();
  rows.push([
    'Browser',
    !info ? 'MISSING' : info.ours ? 'attached' : 'NOT OURS',
    !info
      ? `nothing at ${CDP_URL}; pnpm shots --start-browser`
      : info.ours
        ? info.version
        : `${info.version} at ${CDP_URL} was not started by pnpm shots here`,
  ]);

  const app = isLocal(opts.base) ? await httpGet(opts.base.href) : null;
  const build = app
    ? await buildState(opts.base)
    : { served: false, stamp: null, state: 'n/a', detail: 'no app' };
  rows.push([
    'App',
    !app ? 'MISSING' : `HTTP ${app.status}`,
    !isLocal(opts.base)
      ? `${opts.base.origin} is not this machine; not contacted`
      : !app
        ? `nothing answers at ${opts.base.origin}`
        : build.served
          ? `the production build in .next, at ${opts.base.origin}`
          : `${opts.base.origin}: not the build in .next`,
  ]);
  rows.push(['Build age', build.state.toUpperCase(), build.detail]);

  const settings = readSettings();
  const supabase = app ? supabaseOf(app.headers) : null;
  rows.push([
    'Supabase',
    !app
      ? 'unknown'
      : !supabase
        ? 'NOT STATED'
        : !isLocal(supabase)
          ? 'HOSTED'
          : (await httpGet(new URL('/auth/v1/health', supabase).href, 4000))
            ? 'answers'
            : 'DOWN',
    !app
      ? 'needs the app: it is read from what the app sends'
      : !supabase
        ? 'the app sends no policy naming it; a batch will refuse to run'
        : isLocal(supabase)
          ? `${supabase.origin}, as the running app states (npx supabase start)`
          : `${supabase.origin}: not the local stack; a batch will refuse to run`,
  ]);

  const backend = settings.backendUrl;
  rows.push([
    'Simulation server',
    !backend
      ? 'not set'
      : !isLocal(backend)
        ? 'hosted'
        : (await httpGet(backend.href, 4000))
          ? 'answers'
          : 'DOWN',
    !backend
      ? 'NEXT_PUBLIC_BACKEND_URL is missing: custom runs cannot work'
      : isLocal(backend)
        ? backend.origin
        : `${backend.origin} (.env.local): not contacted; custom runs would go there`,
  ]);

  rows.push([
    'Settings',
    !settings.present
      ? 'MISSING'
      : settings.anonKey && settings.mapboxToken
        ? 'ok'
        : 'check',
    !settings.present
      ? 'no .env.local'
      : `anon key ${settings.anonKey ? 'set' : 'MISSING'}; Mapbox token ${
          settings.mapboxToken ? 'set' : 'missing (maps show their error)'
        }`,
  ]);

  let probeText = null;
  if (info?.ours && app && supabase) {
    const { browser, context, page } = await attach();
    try {
      const seen = await observeRole(
        page,
        context,
        opts.base,
        supabase,
        opts.timeout * 1000
      );
      rows.push(['Viewport', await viewportOf(page), 'what the page gets']);
      rows.push([
        'Session',
        seen.role === 'guest' ? 'signed out' : seen.role,
        seen.role === 'unknown'
          ? `${seen.reason}; a batch will refuse to run`
          : seen.role === 'guest'
            ? 'no profile asked for and no session stored'
            : 'the role in the profile the app loaded',
      ]);
      if (opts.probe) {
        const network = await watchNetwork(page, context);
        try {
          await page.goto(new URL(opts.probe, opts.base).href, {
            waitUntil: 'domcontentloaded',
            timeout: opts.timeout * 1000,
          });
          probeText = (await settle(page, network, opts.timeout * 1000)).text;
        } finally {
          await network.stop();
        }
      }
    } catch (err) {
      rows.push(['Session', 'unknown', redact(err.message.split('\n')[0])]);
    } finally {
      await browser.close().catch(() => {});
    }
  } else {
    rows.push(['Session', 'unknown', 'needs our browser and a local app']);
  }

  printTable(['Check', 'State', 'Detail'], rows);
  if (probeText !== null) {
    console.log('');
    console.log(`Text of ${opts.probe}:`);
    console.log(probeText ? redact(probeText.slice(0, 800)) : '(no text)');
  }
  return info?.ours && app ? 0 : 1;
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
  if (opts.mode === 'forget') return forgetProfile();
  if (opts.mode === 'stamp') return stampBuild(opts);
  if (opts.mode === 'accept') return acceptRun(opts);
  if (opts.mode === 'preflight') return preflight(opts);
  const nothingToShoot = opts.pages.length === 0 && opts.groups.length === 0;
  if (opts.mode !== 'help' && nothingToShoot && opts.clear) {
    return clearOnly(opts);
  }
  if (opts.mode === 'help' || nothingToShoot) {
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
