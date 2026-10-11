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

The two commands are kept in `docs/guides/commands/`. Claude loads them from
`.claude/commands/` in the folder above this repo, which holds a copy.

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

`pnpm shots:build` records the app source, runs `pnpm build`, and then writes
`.next/shots-build.json`: the commit, a fingerprint of the content of every
app source file, and the Supabase and simulation-server origins that were
built in (`NEXT_PUBLIC_*` values are fixed at build time). It refuses to stamp
if the source or `.env.local` changed while the build ran.

| Build age | Means                                                               |
| --------- | ------------------------------------------------------------------- |
| `CURRENT` | The build was made from the source as it is now                     |
| `STALE`   | App source or `.env.local` changed since. Rebuild                   |
| `UNKNOWN` | Built with plain `pnpm build`, so there is nothing to compare       |
| `N/A`     | A dev server, or a server started before the last build: restart it |

**A batch refuses to run unless the build is `CURRENT`.** `--allow-stale`
overrides that, and is how to shoot the dev server:
`pnpm shots --allow-stale --base-url http://localhost:3055 ...`.

Changes under `docs/`, `scripts/`, `e2e/`, `supabase/` and to `*.md` files do
not count as app source. An edit anywhere else does, a new untracked folder
included.

### How the app reaches the local backend

The browser runs on this machine, so there is no emulator loopback address to
translate: it calls Supabase at `http://127.0.0.1:54321` directly, as
`.env.local` says.

- Plain HTTP is allowed because `next.config.ts` leaves
  `upgrade-insecure-requests` out when Supabase is local, and lists the
  Supabase origin in the content security policy.
- Open the app as `http://localhost:3056`, always. The session is kept in
  the browser's storage for that exact origin, so `localhost` and `127.0.0.1`
  are signed in separately.
- **A batch refuses to run when the app or its Supabase is not local**, like
  `scripts/check-write-paths.mjs`. It asks the running app, not a file: the
  Supabase origin is read from the content security policy the app sends, and
  a page that calls a Supabase elsewhere stops the batch. `--allow-hosted`
  overrides it.
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
pnpm shots --group docs                 # every docs page in the manifest
pnpm shots --group all --states --scroll   # everything, with states
pnpm shots home= login=login            # pages by hand
pnpm shots --only map,map-stats         # those manifest entries, nothing else
```

A run folder (`screenshots/<date>_<time>_<viewport>/`, or `--run <folder>`)
holds:

- `<name>.png`; `<name>--scrolled.png` with `--scroll` if the page moved;
  `<name>--diff.png` when it changed (the capture greyed out, differing pixels
  red).
- `results.json`. Per run: `complete`, and one record per runner call in
  `batches` (who was signed in, the build, what was planned). Per capture: the
  status (`ok`, `redirected`, `blank`, `crashed`, `left-app`, `error`,
  `state-error`, `http-error`), `changed` with `changedBecause` or
  `unsureBecause`, the map's state (`map`, `mapTiles`, `mapView`), per-image
  pixel counts and where they are (`boxes`), `sameAs`, the page text, hosts
  contacted, failed and write requests, uncaught and console errors. Keys and
  tokens in any of it are replaced with `<redacted>`.
- `index.html`: a contact sheet.

**Exit code**: 0 when every capture was taken, changed or not. 1 when the run
was refused or interrupted, or a capture failed. A run that was killed has
`complete: false`; do not read its results as a finished run. When the app
stops answering mid-run the batch stops after two refused pages, also with
`complete: false` (checked here by stopping the server during a run).

Timings here, at laptop size, with nothing else running: a plain page about
3 s, a map page 7 to 10 s, all 31 captures 3 to 5 minutes (longer when
captures are shot again). With another session loading the machine, map pages
were slower and the local backend answered 503 now and then.

### When a page is captured

No fixed sleeps. A page is captured once all of these hold together: its text
is non-empty and the same on two polls in a row; no request has been in flight
for half a second; and every capture over a full second is identical (2.5 s
on map pages, set by `still` in the manifest). Text alone is not enough here:
the map page's text holds still on "Loading Map..." while it loads.

A page with a map has a fourth condition: **the map itself says it has
loaded.** Stillness cannot stand in for that. The map reads most tiles from
the browser's cache and builds them off the main thread, so on a busy machine
it sat unchanged for seconds with part of itself missing; `/map` took up to
9 s to load here. The app gives no "map ready" signal and these scripts may
not change the app, so the runner finds the Mapbox map object through React's
bookkeeping on the map's element and calls its public `loaded()`. It only
reads. It depends on React internals: if a React or app change breaks it, the
entry's `map` reads `unreadable`, the capture falls back to stillness alone,
and the run's table says so.

If that never happens within `--timeout` (default 30 s) the page is captured
anyway, with `settled: false` and what it was waiting on. A page that stops
answering altogether becomes an `error` after a longer deadline, and the run
carries on in a new tab. Two such captures in a row mean the browser itself
has frozen: the runner restarts its own headless browser once (the session is
in the profile, so it survives) and shoots those two again. A second freeze
ends the batch with exit code 1. _The restart is not verified here: the
browser did not freeze again._

### What changed

Each capture is compared with the baseline in
`screenshots/baseline/<viewport>/`: `new`, `unchanged`, `changed` (reasons in
`changedBecause`) or `unsure` (reasons in `unsureBecause`).

`unsure` means the capture cannot say anything about the app: the map had not
finished loading, a map request or tile failed, the map area came out blank
where the reference's was not, or the local backend answered with a 5xx
(seen here: Supabase answered 503 under load and the report pins vanished
from the map). It is neither changed nor new, `--accept` leaves it out, and
the run ends by naming these captures with the `--only` command that shoots
them again. A capture that reads `unchanged` stays `unchanged` whatever went
wrong: it went wrong the same way in the reference.

```bash
pnpm shots --accept <run>            # its new and changed captures become the baseline
pnpm shots --accept <run> docs home  # only those pages
pnpm shots --group map --against <run>   # compare with another run instead
```

Nothing but `--accept` moves the baseline, so a regression stays "changed"
until it is fixed or accepted. What `--accept` replaces is kept under
`baseline/<viewport>/.history/`. It leaves out any capture that was not
settled, failed, was shot with the role unchecked, in a run that was cut
short, or on a build that was not current; `--force` takes those too.

Three things are compared:

- **Pixels.** Outside the map a pixel differs when a colour channel is off by
  more than 4 of 255, and a capture changed when more than 12 pixels differ.
  These are counts, not a share of the screen, so one changed icon counts. A
  manifest entry can set its own `tolerance` (pixels).
- **The map.** `soft` selectors (default: the map canvas) mark where a small
  shift is not a change: the map is drawn a fraction of a pixel off from one
  load to the next. There a pixel counts only when it has no match within 2
  pixels in either direction, and a capture changed when more than 250 such
  pixels differ (`softTolerance`). This applies only where the map is the
  topmost thing on screen, not to panels over it.
- **Text, and where the page ended up.** The page's whole text, its status,
  final URL and HTTP status are kept with the baseline. A difference is a
  change even when the first screen looks the same, which covers text below
  the fold. Clock times and "Updated ... ago" are masked.

A capture that does not read `unchanged` is **shot again, up to three times in
all**, the last time in a new tab. One capture that matches the reference
settles it; a change has to show on every attempt. A change in the app is
there on every load. These are not: a backend error that happened once, and
the map area landing one pixel to the side. The second is this app's layout:
the map starts 59.19 px from the left, and the browser rounds that either
way from one load to the next (roughly 1 map load in 10 here), which moves the map
and the panels over it by a pixel. `retried: true` marks these captures, and
`earlierAttempts` holds what each earlier attempt saw. When attempts
disagree, the earlier image and its diff are kept as
`<name>--attemptN.png`.

The cost: a fault that shows only on some loads can read `unchanged`.
`earlierAttempts` is where it leaves a trace.

`ignore` selectors and `ignoreText` patterns leave an element, or the text
itself, out of the pixel comparison (the chatbot's message time uses this).

**Duplicates.** A page whose text equals an earlier page's in the same batch
is recorded `sameAs` it. It gets no image of its own only if it never had
one: a page that used to be its own screen and now shows another's is
captured, compared and reported as changed.

**Measured here** (laptop size, signed out, 2026-10-10): one run as the
reference, then four more against it, 124 captures. All 124 read `unchanged`;
5 of them needed a second or third attempt (all on map pages). Among the
captures that matched, the worst had 0 differing pixels outside the map, 31
inside it, and a largest channel difference of 31, against thresholds of 12
and 250. So the thresholds were left as they were.

Checked here with doctored copies of a run: a colour shift of (6, 9, 5) on a
16x16 block, a blanked 32x32 block, a 2-pixel line across the map, and a page
made to show another page's content each read `changed` on all three
attempts, with a box on the right spot. With the map's style blocked, a map
capture read `unsure` (not loaded, a failed map request, a blank map area).

What it does not catch:

- A pixel change below the first screen that changes no text, unless
  `--scroll` is on (one scroll step only).
- Anything inside an ignored element; a shift of 2 pixels or less on the map.
- A change that shows on some loads only (see the three attempts above).
- **A map the runner cannot question.** When `map` reads `unreadable` the
  old weakness is back: a capture can settle before the map has drawn.
- The local database and today's date. Data pages change when the data does;
  nothing pins the seed or the clock.

### Comparable runs

A browser has no status bar or clock to pin. The run asks for reduced motion
and freezes CSS animations at capture, then puts the setting back, also on
failure. So captures show the app's reduced-motion rendering.

- `--font-scale 1.5` scales the browser's default font size for the run (the
  equivalent of a phone's larger-text setting), restores it, and compares
  against its own baseline folder.
- `--run <folder>` adds to an existing run folder, so one report can cover
  batches shot as different users. It refuses a folder shot at another size,
  font scale or base URL.
- `--stop-after` closes the browser when the batch ends.

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
not shot), `tolerance` and `softTolerance` (pixels), `still` (milliseconds),
`ignore`, `ignoreText`, `soft`, and `minWidth`/`maxWidth` or `viewports` for
something that exists only at some sizes. `defaults` at the top applies to
every entry. A page given on the command line or in a `--pages` file takes the
defaults but can never carry `steps`.

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
  never runs those; they are listed as not shot. To capture a confirmation
  dialog, write an ordinary state that stops before the confirming click.
- While steps run, writes that would leave this machine (anything but a read
  to a non-local host) and calls to the chatbot are blocked and listed in
  `blockedRequests`. Writes to the local database go through and are listed
  in `writeRequests`.
- A `fill` into a password field is refused, and a failed `fill` shows the
  length of its value, never the value.
- End with a `waitFor` for what the last click causes.

## Signing in

No route redirects to a sign-in page: every page opens signed out, and panels
inside them change with the user (guest, citizen, agency staff, admin). So a
session is put into the browser once, and the runs after that use it.

The script never signs in and never reads or prints a password, token or key.
From `.env.local` it reads two URLs and whether two values are set.

Sign in by hand, in a real window:

```bash
pnpm shots --stop-browser
pnpm shots --start-browser --headed
# sign in at http://localhost:3056/login, then:
pnpm shots --stop-browser
pnpm shots --start-browser --viewport laptop
```

The session survives the restart: it is in the browser's profile (checked
here: signed in headed, read back as `citizen` headless). The local database has seeded accounts for each role
(`supabase/seed.sql`). An agent should not type or look up a password; a
password given on a command line ends up in the shell history and the
transcript.

Sign out with `pnpm shots --clear` (cookies and storage for the app's origin
only), or wipe the whole profile with `pnpm shots --forget-profile`.

**`--as <role>` is always checked**, and defaults to `guest`. Before the first
page the runner loads one page and looks at two things: the role in the
profile the app itself fetches (the response body only), and whether the
browser's storage holds a Supabase session entry (its name only, never its
contents).

| It sees                                             | Result                     |
| --------------------------------------------------- | -------------------------- |
| A profile with a role                               | That role                  |
| No profile asked for, nothing stored, page settled  | `guest`                    |
| Anything else (session stored but no profile, etc.) | `unknown`: the batch stops |

A role other than the one given stops the batch. Signed in, every capture's
name gains the role (`map-profile@citizen`), however the page was named, so
one role's capture is never compared with, or accepted over, another's.
Checked here signed out and as a citizen (2026-10-11): signed in, a batch
with no `--as`, or with another role, stopped before the first page; with
`--as citizen` a manifest page and a hand-given page were both saved with
`@citizen` in the name. _Staff and admin not checked._

Email addresses are masked in the page text a run keeps, as clock times are.
The images are not: a capture of a profile page shows whose account it is, so
treat a signed-in run folder as private.

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
  when done: `pnpm shots --stop-browser`, or pass `--stop-after` to a batch.
- **Only its own browser.** The runner drives, signs out and closes a browser
  only if it is the one it started from this folder (it compares the port's
  endpoint with the one written in its profile). Anything else on the port is
  refused. `SHOTS_CDP_URL` and `SHOTS_BASE_URL` move the two ports, which is
  how two checkouts run side by side.
- **A frozen browser.** Under heavy load the browser can stop answering.
  A capture then fails after its deadline, and `--stop-browser` ends the
  process it started when asking it to close gets no reply.
