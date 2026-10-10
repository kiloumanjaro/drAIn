# Device Testing

How to look at the app as it really renders, screenshot it page by page, and
see which pages a change altered. Unit tests render components without drawing
a pixel, so layout, spacing and clipping are invisible to them.

drAIn is a web app, so the "device" is a browser: the Chromium that Playwright
installed for `e2e/`, started once in the background and reached over its
remote-debugging port. A page's "deep link" is its URL.

| Piece                         | What it is                                                         |
| ----------------------------- | ------------------------------------------------------------------ |
| `scripts/shots.mjs`           | `pnpm shots`: browser, preflight, shoot, compare, accept           |
| `scripts/screenshot.mjs`      | `pnpm screenshot <name>`: one PNG of what the browser shows now    |
| `scripts/shots.manifest.json` | The name, group and URL of every page, and the scripted states     |
| `/pages`                      | Claude command: every page and state found in the source, by group |
| `/shots <group>`              | Claude command: shoot a group and write `REPORT-<group>.md`        |
| `screenshots/`                | Output: one folder per run, and `baseline/`. Not in git            |

The two commands live in `.claude/commands/` in the folder above this repo.

Everything on this page was run on this machine on 2026-10-10 unless it is
marked _not verified here_.

## Start everything

Run from `drAIn-frontend/`.

```bash
# 1. Local backend. Start Docker Desktop first.
npx supabase start

# 2. A production build, stamped with the source it was made from (about
#    60 to 75 s here), served on its own port.
pnpm shots:build
pnpm start --port 3056

# 3. The browser (in another terminal; it returns once the browser is up).
pnpm shots --start-browser --viewport laptop

# 4. One table: is everything there?
pnpm shots --preflight
```

- Sizes for `--viewport`: `phone` 390x844, `tablet` 768x1024, `laptop`
  1366x768, `desktop` 1920x1080, or `WIDTHxHEIGHT`. The page gets exactly that
  size (checked at laptop, phone and 320x640). Changing size means
  `pnpm shots --stop-browser` and starting again.
- The session survives a restart: it is in the browser's profile
  (`node_modules/.cache/shots-browser-profile`).
- Headless runs use Playwright's headless-shell build. Full Chromium run
  headless shrinks the page by its window frame (1366x768 gave 1348x616) and
  will not go narrower than about 480.
- If Chromium is missing: `pnpm exec playwright install chromium`.
- After a rebuild, stop and start `pnpm start` again; it does not pick up a
  new build.

### Why a production build

`pnpm dev` is the wrong thing to photograph: it compiles each page on its
first visit, so the first capture of every page waits on the compiler
(`playwright.config.ts` works around the same thing), and it runs with a
looser content security policy (`next.config.ts`) than users get. The dev
server also draws its own indicator on the page. _Indicator not verified
here._

Port 3056, not 3055: `pnpm test:e2e` reuses whatever answers on 3055, and
would run against a stale build left there.

`pnpm shots:build` is `pnpm build` plus `pnpm shots --stamp-build`, which
writes `.next/shots-build.json`: the commit, a fingerprint of uncommitted app
source, and the Supabase and simulation-server origins that were built in
(`NEXT_PUBLIC_*` values are fixed at build time). The preflight compares the
stamp with the working tree:

| Build age | Means                                                         |
| --------- | ------------------------------------------------------------- |
| `CURRENT` | Same commit, same uncommitted app changes                     |
| `STALE`   | The commit moved, or app source changed since. Rebuild        |
| `UNKNOWN` | Built with plain `pnpm build`, so there is nothing to compare |
| `N/A`     | A dev server, or not the build in `.next`                     |

Changes under `docs/`, `scripts/`, `e2e/`, `supabase/` and to `*.md` files do
not count as app source.

To shoot the dev server anyway: `pnpm shots --base-url http://localhost:3055 ...`.

### How the app reaches the local backend

The browser runs on this machine, so there is no emulator loopback address to
translate: it calls Supabase at `http://127.0.0.1:54321` directly, as
`.env.local` says.

- Plain HTTP is allowed because `next.config.ts` leaves
  `upgrade-insecure-requests` out when Supabase is local, and lists the
  Supabase origin in the content security policy.
- Open the app as `http://localhost:3056`, always. The session is a cookie,
  and `localhost` and `127.0.0.1` are different sites to the browser.
- **A batch refuses to run when the app's Supabase is not local**, like
  `scripts/check-write-paths.mjs`. `--allow-hosted` overrides it.
- The simulation server is separate. `.env.local` points
  `NEXT_PUBLIC_BACKEND_URL` at the hosted one; no page in the manifest
  contacted it on load. To use a local one, run
  `uvicorn app.main:app --reload` in `drAIn-backend` (port 8000), allow
  `http://localhost:3056` in its `ALLOWED_ORIGINS`, set the variable and
  rebuild. _Not verified here._
- Each page's `externalHosts` in `results.json` lists what it did contact:
  Mapbox on the map pages, YouTube and Google on the docs demo section.

## Shooting

```bash
pnpm shots --group docs                       # every docs page in the manifest
pnpm shots --group all --states --as guest    # everything, with states
pnpm shots home= login=login                  # pages by hand
```

A run folder (`screenshots/<date>_<time>_<viewport>/`, or `--run <folder>`)
holds:

- `<name>.png`; `<name>--scrolled.png` with `--scroll` if the page moved;
  `<name>--diff.png` when the page changed (the capture greyed out, differing
  pixels red).
- `results.json`: per capture the status (`ok`, `redirected`, `blank`,
  `crashed`, `left-app`, `error`, `state-error`), HTTP status, where it ended
  up, seconds taken, `changed` and `diffRatio`, `sameAs`, the page text, hosts
  contacted, failed requests, uncaught and console errors. Keys and tokens in
  any of that text are replaced with `<redacted>`.
- `index.html`: a contact sheet.

Timings here, at laptop size: a plain page about 2.5 s, a map page 7 to 10 s,
all 29 captures 3 min 37 s.

### When a page is captured

No fixed sleeps. A page is captured once all of these hold together: its text
is non-empty and the same on two polls in a row; no request has been in flight
for half a second; and every capture over a full second is identical. Text
alone is not enough here: the map page's text holds still on "Loading Map..."
while it loads.

If that never happens within `--timeout` (default 30 s) the page is captured
anyway, with `settled: false` and what it was waiting on.

### What changed

Each capture is compared with `screenshots/baseline/<viewport>/<name>.png`:
`new` (no baseline), `unchanged` or `changed`.

```bash
pnpm shots --accept <run>            # that run becomes the baseline
pnpm shots --accept <run> docs home  # only those pages
```

Nothing else moves the baseline, so a regression stays "changed" until it is
fixed or accepted.

- A pixel differs when a colour channel is off by more than 24 of 255. A page
  changed when more than 0.1% of its pixels differ; a manifest entry can set
  its own `tolerance`.
- `soft` selectors (default: the map canvas) mark where a small shift is not a
  change. The map is drawn a fraction of a pixel off from one load to the
  next, so there a pixel only counts when nothing within 2 pixels of it
  matches. This applies only where the map is the topmost thing on screen, not
  to panels over it.
- `ignoreText` patterns (default: a clock time such as "10:19 AM") and
  `ignore` selectors leave an element out of the comparison altogether.
- Measured with no code change: the 12 map, simulation and dashboard captures
  re-shot four times, and all 29 once, gave no false "changed". A one-line
  size change to the not-found heading flagged that page and no other.
- **Duplicates.** A page whose text equals an earlier page's in the run gets
  no second image, only `sameAs`. That is how a redirect or a default tab
  shows.

What it does not catch: a change below the first screen unless `--scroll` is
on, anything inside an ignored element, and a shift of 2 pixels or less on
the map itself.

### Comparable runs

A browser has no status bar or clock to pin. The run asks for reduced motion
and freezes CSS animations at capture, then puts the setting back, also on
failure. So captures show the app's reduced-motion rendering.

- `--font-scale 1.5` scales the browser's default font size for the run (the
  equivalent of a phone's larger-text setting), restores it, and compares
  against its own baseline folder.
- `--clear` clears the app's cookies and storage once, before the first page.
  That signs the browser out.
- `--run <folder>` adds to an existing run folder, so one report can cover
  batches shot as different users.

## The manifest

`scripts/shots.manifest.json` is where page names live, so a page keeps its
name, and with it its baseline, from run to run.

```json
{
  "name": "map-report",
  "group": "map",
  "path": "/map?activetab=report"
}
```

Optional per entry: `needs` (the lowest role it is of use to), `param` (a
value the URL needs and where a real one comes from; such pages are listed as
not shot), `tolerance`, `ignore`, `ignoreText`, `soft`. `defaults` at the top
applies to every entry.

`/pages` finds routes in the source every time and reports what the manifest
is missing or still lists. Never rename an entry: the baseline is keyed by
name.

### States

A state is a screen with no URL of its own. It is a page plus steps:

```json
{
  "name": "dashboard-nav-drawer",
  "group": "dashboard",
  "path": "/dashboard",
  "viewports": ["phone"],
  "steps": [
    { "click": { "role": "button", "name": "Open navigation" } },
    { "waitFor": { "text": "Documentation", "exact": true } }
  ]
}
```

- Steps: `click`, `hover`, `fill` (with `value`), `press` (a key name),
  `waitFor`. A target is `{ "role", "name" }`, `{ "label" }`, `{ "text" }` or
  `{ "selector" }`.
- `--states` runs them after the pages of the same groups. A state is
  captured, compared and listed like a page. A step that fails gives
  `state-error` naming the step, and the capture shows where it stopped.
- `viewports` limits a state to the sizes where it exists.
- `"mutates": true` marks a state whose steps would change data. The runner
  never runs those. Do not put a password in a `fill`.
- End with a `waitFor` for what the last click causes.

## Signing in

No route redirects to a sign-in page: every page opens signed out, and panels
inside them change with the user (guest, citizen, agency staff, admin). So a
session is put into the browser once, and the runs after that use it.

The script never signs in and never reads or prints a password, token or key.
From `.env.local` it reads two URLs and whether two values are set.

With a short script, the account passed in the environment so it is never
written down. Save it inside `screenshots/` (ignored by git) and delete it
afterwards:

```js
// screenshots/act.mjs  ->  SHOTS_EMAIL=... SHOTS_PASSWORD=... node screenshots/act.mjs
import { attach } from '../scripts/screenshot.mjs';

const { browser, page } = await attach();
await page.goto('http://localhost:3056/login');
await page.getByLabel('Email').fill(process.env.SHOTS_EMAIL);
await page.getByLabel('Password').fill(process.env.SHOTS_PASSWORD);
await page.getByRole('button', { name: 'Log In' }).click();
await page.waitForURL('http://localhost:3056/');
await browser.close(); // disconnects; the browser and the page stay
```

Or by hand: `pnpm shots --stop-browser`, `pnpm shots --start-browser --headed`,
sign in at `http://localhost:3056/login`, stop it, and start it headless at
the size you want. _Not verified here._

The local database has seeded accounts for each role (`supabase/seed.sql`).

**`--as <role>` is checked.** Before the first page the runner loads one page
and reads the role from the profile the app itself fetches (the response
body only; no cookie or token). `--as staff` in a browser signed in as a
citizen, or signed out, stops the batch. Signed in, page names gain the role
(`map-profile@citizen`), so each role has its own baseline. Checked here as
guest and citizen; _staff and admin not verified here._

## Typing and clicking from the command line

For a state worth keeping, add it to the manifest. For a one-off, drive the
browser with a few lines using `attach()` as above, then
`pnpm screenshot <name> --run <folder>`.

Quirks:

- **Git Bash rewrites a leading slash** in an argument into a Windows path
  (`docs=/docs` arrives as `docs=C:/Program Files/Git/docs`). Leave the slash
  off (`docs=docs`, `home=`); the script refuses a rewritten path.
- **`&` and `?` in a URL** need quoting in both shells, and `&` can still be
  cut by `pnpm` on Windows. Put such pages in the manifest, or in a file for
  `--pages <file.json>`.
- **Find things by role and name**, not by position: positions change with
  the viewport, which is the thing under test.
- **`pnpm screenshot` captures at once**, without waiting for the page to
  settle. Wait for what your click causes before calling it.
- **The docs demo section embeds a video** whose requests never finish. The
  runner starts its network count afresh at each navigation because of it.
- **The map needs WebGL**, drawn in software by headless Chromium. It is why
  map pages take several seconds. The 3D model viewer is slower still.
  _Viewer not verified here._
- **`pnpm lint` reads `.mjs` files anywhere**, including a helper left in
  `screenshots/`. Delete it when done.
- **The debugging port (9222) has no password.** While the browser runs, any
  program on this machine can drive it, signed-in session included. Stop it
  when done: `pnpm shots --stop-browser`.
