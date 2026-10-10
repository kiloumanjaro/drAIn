---
description: Screenshot one or more page groups of the drAIn web app in a real browser, say which changed, and write a report per group
argument-hint: <group ...> | all  [phone|tablet|laptop|desktop]  [states]
---

Screenshot the page groups named in `$ARGUMENTS` and report what each page
shows and which changed. Work from `drAIn-frontend/`. This command never
changes app code: no screen, route, guard, backend or seed file. It writes
only under `drAIn-frontend/screenshots/`, plus new entries in
`drAIn-frontend/scripts/shots.manifest.json`.

Arguments: `$ARGUMENTS`

- Group names: `auth`, `home`, `map`, `simulation`, `dashboard`, `docs`,
  `system`, any group the manifest has gained, or `all`.
- Optional size: `phone`, `tablet`, `laptop` (default) or `desktop`.
- Optional `states`: also run the group's scripted states (step 6).
- **With no group, print the group list and the sizes, and stop.** An unknown
  word is not a group: say so, print the list and stop. Never guess a group.

## 1. Read first

- `drAIn-frontend/docs/guides/DEVICE_TESTING.md`: the real commands, how a
  capture is judged settled and changed, what it cannot catch, and what is not
  yet verified here.
- `pnpm shots --help` for the runner's options (`scripts/shots.mjs`).

## 2. Bring the manifest up to date

Build the page list for the requested groups the way `/pages` does, from the
routing source, and compare it with `scripts/shots.manifest.json`:

- A URL in the source but not in the manifest: add an entry (`name`, `group`,
  `path`; `param` if the URL needs a real value; `needs` if it is of no use
  below some role). Say what you added.
- Never rename or re-path an existing entry: the baseline is keyed by name.
- An entry no longer in the source: leave it, and report it.

## 3. Get the device and the app up

1. `pnpm shots --preflight`. It loads one page, so it takes a few seconds.
   Note the **Session** row: it must read the same when you finish.
2. **Browser** `MISSING`: `pnpm shots --start-browser --viewport <size>`. If
   one of ours is running at another size, `pnpm shots --stop-browser` and
   start it again. `NOT OURS`: something else holds the port; do not close it.
   Tell the user.
3. **Build age** anything but `CURRENT`, or no app at `http://localhost:3056`:
   it needs `pnpm shots:build`, then `pnpm start --port 3056` in the
   background. A server left running across a rebuild reads `N/A`: stop it
   first, by port, never by program name:
   `Get-NetTCPConnection -LocalPort 3056 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`
   **Before building, say that a build is needed and that it takes about a
   minute.** The runner refuses a build that is not current; `--allow-stale`
   is the user's call, not yours.
4. Local Supabase down: say so. Starting it means Docker Desktop and
   `npx supabase start`; ask before starting Docker. Never stop, reset or
   reseed a Supabase you did not start.
5. Run the preflight again and show its table. Do not go on until Browser is
   `attached`, Build age is `CURRENT`, Supabase `answers` and Session is not
   `unknown`.

## 4. Decide what can be shot

- **Supabase** `HOSTED` or `NOT STATED`: stop. The runner refuses, and
  `--allow-hosted` is the user's call.
- **Session** says who is signed in. Pass that role as `--as`; the runner
  checks it and stops on a mismatch or when it cannot tell.
- If a requested group can only be shot signed in and no session can be had,
  **stop with the table**. Do not open pages that can only show their
  signed-out message, unless the user asked for proof of exactly that.

Accounts:

- Never type, receive, look up or guess a password, and never write an email,
  password or token into a file, a report, the manifest, a command or chat.
- To shoot as a role, ask the user to sign in themselves in a headed window
  (the doc's "Signing in"). Then carry on with `--as <that role>`.
- **Never pass `--clear` without asking.** It signs the browser out of a
  session the user put there, and you cannot put it back.
- No session for a role: shoot what is reachable. The runner lists entries
  whose `needs` is above the current role as **gated**.
- Several roles: one runner call per role, into one run folder with
  `--run <folder>`, in whatever order the user signs in. The runner adds the
  role to each name itself (`map-profile@staff`).

Route params:

- An entry with `param` is listed by the runner as **needs seed data**. To
  shoot it, find a real value where `param` says (a file under `public/`, a
  table in the running local stack) and pass that one page with
  `--pages <file.json>`. Never invent an id, and never create data to get one.

## 5. Run the batch

```bash
pnpm shots --group <group>[,<group>] --run <folder> --as <role in the Session row> --scroll
```

- A full run takes about four minutes: run it in the background or with a
  ten-minute limit. Add no sleeps and no loops; the runner waits for each
  page, re-shoots anything that reads changed, and compares with the baseline.
- Exit code 1 means refused, interrupted or a failed capture: read its last
  lines before anything else.
- Then read `screenshots/<folder>/results.json`. **If `complete` is not true,
  the run was cut short: say so and do not report it as a finished run.**

## 6. States (only when asked)

Add `--states` to the same call. For a state `/pages` lists that the manifest
does not script yet:

1. Write its entry (`steps` ending in a `waitFor`; `minWidth`/`maxWidth` or
   `viewports` if it exists only at some sizes) and run it. Fix the steps
   until the capture shows the state. Then leave the entry in the manifest.
2. `"mutates": true` means **never run**. Use it for an entry that would
   submit, confirm, reject, record, delete, upload, send a chat message,
   change a role or leave an agency, so it shows up as not shot. To capture a
   confirmation dialog, write an ordinary state whose steps stop before the
   confirming click. Some actions here write on the first click with no
   dialog: read the handler before scripting a click.
3. After a state runs, check its `writeRequests` and `blockedRequests`. A
   write you did not expect means the entry is wrong: fix it and tell the
   user what was written.
4. Use `pnpm screenshot <name> --run <folder>` only for a one-off that is not
   worth keeping.

## 7. Look

- **Open every image whose `changed` is `new` or `changed`**, and for
  `changed` its `--diff.png` first: red marks where it differs. Include
  `--scrolled` images. Read `changedBecause` and `textChanged` too: a capture
  can be changed by its text or final URL with identical pixels.
- A solid red block on the map with nothing else different is a map tile that
  did not arrive, not a UI change (the doc's "What it does not catch"). Say
  which captures looked like that; shoot them once more before reporting.
- Captures that are `unchanged` are confirmed from the JSON alone (status,
  final URL, text). Do not open them, and say that you did not. A `sameAs`
  entry counts as unchanged only if its `changed` says so.
- A capture with `settled: false` was taken while the page was still moving:
  open it whatever it says, and say so.
- If nothing is new or changed, say so; that is a result.

For each opened image record what is on screen, then visible problems:
clipping, overlap, uneven spacing, low contrast, truncated text, placeholder
content, anything off-screen, an unreachable control, an error message. Check
`pageErrors`, `consoleErrors` and `failedRequests` for the same page.

## 8. Report

Write `screenshots/<folder>/REPORT-<group>.md` per group. When several groups
ran, also `screenshots/<folder>/REPORT.md`: one line per group with its counts
and a link.

Each group report:

- Header: date, base URL, viewport, the build's state and commit, and who was
  signed in, all from `batches` in `results.json`.
- One section per page or state: **status** (reachable, redirected to X,
  gated, needs seed data, blank, crashed), **changed / unchanged / new** with
  the reason, the image path, observations, issues. Map the runner's status:
  `ok` is reachable; `redirected`, or a `sameAs` whose twin is another URL, is
  redirected to that page; `blank` and `crashed` as they are; `error`,
  `http-error`, `left-app` and `state-error` with the error text.
- **Issues across pages**: recurring problems grouped, each with the pages it
  appears on, so it can become one batched UI prompt.
- **How this was checked**: which images were opened, which captures were
  confirmed by text only, and which were re-shot (`retried`). State it
  plainly; do not let "captured" read as "looked at".
- What was not shot and why: the run's `skipped` list.

Give the same summary in chat: per group the counts by status and by changed,
the issues across pages, opened versus text-only, and the path to
`index.html`.

## 9. The baseline

Never run `pnpm shots --accept` on your own, and never with `--force`. After
the report, name the captures that are `new` or `changed` and ask whether to
accept them. Accepting a change you were not asked to make hides it from every
later run.

## 10. Leave things as found

Stop anything this command started (the app server, and the browser if the
user did not have one running), delete any helper script written under
`screenshots/`, and say what is still running. The Session row must read as
it did at the start. Do not stop Supabase or Docker if they were already up.
