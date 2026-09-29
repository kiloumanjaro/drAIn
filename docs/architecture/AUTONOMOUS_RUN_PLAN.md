# Autonomous run plan (multi-hour, unattended)

Written 2026-09-27 for a long unattended session across both repos. The session works top to bottom, ticks boxes here as it goes, and appends to the run log at the end. Read this whole file before starting, and again after any context reset.

Repos, both on branch `reaudit`, which is on top of `trust-and-ops` and not merged:

- `drAIn-frontend` (Next.js + local Supabase). Schema workflow: see `CLAUDE.md`.
- `drAIn-backend` (FastAPI + SWMM). Gates: ruff format, ruff check, pytest.

## Ground rules (never break these)

1. **Local only.** Never push, merge, deploy, or touch the hosted Supabase project, Vercel or Render. Don't change `.env*` files.
2. **No paid calls.** Never send a real request to Gemini. Test the chatbot only up to the point before the model call.
3. **Never print secrets.** Read keys into variables and never echo them; say "the local anon key".
4. **No real personal data.** Seeds stay made up.
5. **Delete only tracked files inside the two repos**, and only when they are proven unused (grep plus type-check). Nothing outside the repos: the stray `Project Drain/supabase/` folder is left alone and listed for the user.
6. **Stop what you start.** Stop every dev server or uvicorn process you start, by port, when the item is done.
7. **Scratch files** go only under `C:\Users\KINTLO~1\AppData\Local\Temp\claude\...\scratchpad`, never `C:\KINTLO~1\...`.

## Mechanics that went wrong before (avoid)

- **Commits:**
  - Write the message to a file first, with the Write tool.
  - Then commit in the same `&&` chain as the gates: `gates && git add -A && git commit -F msg && git log --oneline -1`.
  - Never put a heredoc between a failed check and `git commit`.
- **Line endings:** backend files are CRLF. Edit with the Edit tool, or with a script that matches either line ending.
- **Replacement strings:** in JS `String.replace`, pass the replacement as a function, so `$$` stays literal.
- **Bash heredocs** that contain `''` or backticks have failed. Put scripts in files instead.
- **Subagents:** long audit subagents timed out on 2026-09-26 (API errors).
  - Keep each subagent to one narrow question, under about 10 minutes, run it in the background, and retry once.
  - If it fails twice, do that audit inline instead.
- **Migrations:** after `declarative sync`, open the migration and check that every `CREATE TYPE` comes before its first use. Fix the order by hand if not, and mark it `-- Hand-edited:`.
- **Tests:** pgTAP tests that file several reports as one user must use different components, because of the duplicate rule.

## Gates

**Frontend, per commit:**

1. Schema changes (skip if there are none):
   - `npx supabase db schema declarative sync --name <x> --no-apply`
   - `npx supabase db reset`
   - declarative sync again, which must print "No schema changes found"
   - gen types from Git Bash, then prettier
2. `pnpm type-check`
3. `pnpm test`
4. `pnpm lint`: no new warnings
5. `npx supabase test db`
6. `npx supabase db advisors --local`: no new WARN or ERROR

**Backend, per commit:**

1. `.venv/Scripts/ruff.exe format --check app drain tests scripts`
2. `.venv/Scripts/ruff.exe check app drain tests scripts`
3. `.venv/Scripts/python.exe -m pytest -q`

## Timebox and stop rules

- Each item has a timebox. If an item isn't green by twice its timebox:
  - revert that item's files (`git checkout -- <files>`, or delete the new files);
  - log why in the run log;
  - move on to the next item that doesn't depend on it.
- Never loosen a type, test or policy to make a gate pass.
- If the local Supabase stack or Docker stops responding and one restart doesn't fix it (`npx supabase stop && npx supabase start`), do only backend and docs items from then on.
- When every box is ticked, or everything left is blocked, do Phase 5 and stop.

---

## Phase 0: Setup (15 min)

- [x] Check both repos are on branch `reaudit` with clean trees. Run `npx supabase status`; if the stack is down, start Docker and run `npx supabase start`.
- [x] Run every gate once on both repos, and record the baseline numbers in the run log. Expected: pgTAP 140, vitest 215, 19 lint warnings, pytest 252.

## Phase 1: Re-audit into a to-do list (about 1.5 h)

Goal: `docs/architecture/REAUDIT_TODO.md`, a list of **verified** findings, each tagged like this:

`[area] [severity] [effort S/M/L] file:line — problem — fix`

Do the audit as narrow passes, inline or with small background subagents (see Mechanics). Read `DATABASE_AUDIT.md`, `DB_HARDENING_CHECKLIST.md`, `TRUST_OPS_CHECKLIST.md` and `drAIn-backend/docs/SCIENCE_ROADMAP.md` first, so nothing already fixed or already planned gets re-reported.

- [x] **1a. Lint and types.** Explain each of the 19 lint warnings: real problem, or not.
- [x] **1b. Map and simulation pages** (`app/(main)/map/page.tsx`, `app/(main)/simulation/page.tsx`): effect cleanups (map listeners, intervals, realtime), stale closures, very large functions. Propose splits.
- [x] **1c. Control panel, reports, profile and dashboard components:**
  - bugs;
  - fake or hard-coded data shown to users (like the mock trends removed earlier);
  - wrong field use;
  - clickable `div`s with no keyboard handling.
- [x] **1d. `lib/` and `hooks/`:** query keys, error handling, anything still reading more than 1,000 rows without paging.
- [x] **1e. API routes, `proxy.ts`, `next.config.ts`:** security headers, image hosts, input validation, error leakage, `window.open` without `noopener`, rendering model output as HTML.
- [x] **1f. Database:**
  - anon-readable personal data (`reports.user_id`);
  - SECURITY DEFINER functions still executable by anon;
  - storage bucket abuse (anon uploads to ReportImage with no size or rate limit);
  - text-typed numeric columns (barangay population).
- [x] **1g. Backend engineering:**
  - thread safety (JobStore, RunRecorder);
  - repeated heavy work per request;
  - response size (duplicated `nodes_dict`, no gzip);
  - link-suffix matching with `endswith`;
  - `init_flow` actually setting `flow_limit`;
  - unpickling the legacy model;
  - logging and CORS.
- [x] **1h. Claims and docs:** every "AI-powered", "satellite", "real-time", "predict" or accuracy claim in the landing page, docs pages, READMEs, metadata and chatbot prompt, each with accurate replacement wording. Stale docs: `docs/api/SUPABASE.md`, component READMEs.
- [x] **1i. Hygiene and tooling:**
  - `control-panel-portable/`, `components/_unused/`, `BACKEND-DrAin/`, the 5 MB backend `logo.png`;
  - `.gitignore` gaps;
  - `e2e/` has no Playwright config;
  - frontend CI runs no tests and no pgTAP.
- [x] Order `REAUDIT_TODO.md` by value divided by effort, and commit it (`docs: re-audit to-do list`).

## Phase 2: Known backlog (about 20 h of timeboxes: frontend 7.3 h, database cleanup 7.8 h, backend 5.2 h; can run before Phase 1 finishes)

These are already verified. Each is one commit.

### Frontend and database

- [x] **2.1 Frontend CI (45 min).** In `.github/workflows/deploy.yml`, or a new `ci.yml`, run `type-check` and `test` alongside lint. Add a `database` job that does `supabase start`, `supabase db reset` and `supabase test db` (`supabase/setup-cli` action). Can't be run locally beyond a YAML lint; say so in the commit.
- [ ] **2.2 Lint to zero (45 min).** Fix every warning worth fixing; justify any left with an inline disable comment.
- [x] **2.3 Hide private report columns from signed-out visitors (1 h).** Covers item 2 of the 2026-09-28 evaluation.
  - Revoke column `SELECT` from `anon` on:
    - `reports.user_id`;
    - `photo_lat` and `photo_lon` (where the reporter stood);
    - `reviewed_by`;
    - `maintenance.performed_by`.

    Keep them for `authenticated`. If column grants turn out to be awkward with PostgREST, serve public reads through a view instead.

  - Check that every anon read path (map, dashboard, realtime) doesn't select `*` in a way that now fails; switch those to explicit columns.
  - The realtime channel on `reports` sends whole rows to every open map. Check whether Supabase Realtime honours a publication column list (`ALTER PUBLICATION ... ADD TABLE reports (col, ...)`). If not, publish only what the map needs, and have clients refetch by id. Log what was verified.
  - pgTAP: anon can't read those columns; a citizen still reads their own reports; staff still see reviewers.

- [ ] **2.4 Barangay population columns to numbers (30 min).** Change `barangay_boundaries` population and density from text to numeric, hand-editing the migration's data cast. Update readers.
- [ ] **2.5 Report photo uploads (45 min).** Limit anonymous storage inserts to `public/<uuid>.<ext>` image names. Check whether the bucket's 50 MiB limit should be lower (for example 10 MiB) in `config.toml`. pgTAP or a REST check.
- [ ] **2.6 Admin screen for join codes and roles (1.5 h, M).**
  - Admin-only section in the profile panel: rotate the agency's join code (show the new code once, with a copy button) and list agency members.
  - Members are listed by an admin-only SECURITY DEFINER RPC `agency_members()`.
  - Promote or demote members through `set_member_agency`.
  - pgTAP for the new RPC.
- [ ] **2.7 Rewrite `docs/api/SUPABASE.md` (30 min)** from `supabase/schemas/` and `types/database.types.ts`, or replace it with a short page that points at them.
- [x] **2.8 Remove dead code (30 min).** Delete `control-panel-portable/`, `components/_unused/` and `BACKEND-DrAin/` after grep proves nothing imports them, then run type-check, test and lint.
- [ ] **2.9 Accurate claims (45 min).** Apply the wording from 1h, or from roadmap workstream F if 1h isn't done: the landing page, docs sections, metadata, both READMEs, and the chatbot prompt's "satellite data" and "AI analysis" lines.
- [ ] **2.10 Relabel `init_flow` in the UI (20 min).** The link panel's "Initial flow" control sets SWMM's flow limit. Relabel it "Flow limit (m³/s)", with a tooltip. The wire name stays.

### Database cleanup (from the 2026-09-28 evaluation)

Evaluated against the local database on 2026-09-28. Item 2 of that evaluation is folded into 2.3 above. Do these in this order: D1 first, D2 after 2.3, D4 and D5 last.

- [x] **2.D1 Close unused write grants (30 min).**
  - `anon` and `authenticated` hold INSERT, UPDATE, DELETE and TRUNCATE on `reports`, `profiles`, `agencies`, `inlets`, `outlets`, `man_pipes`, `storm_drains` and `geocode_worker_lock`, inherited from the dump's "grant everything" defaults.
  - Row-level security blocks the first three. TRUNCATE ignores it, and today only the API's lack of a TRUNCATE call stops it.
  - Revoke every write the app doesn't use. Keep INSERT on `reports` (the insert policy guards it) and UPDATE and INSERT on `profiles` (own row, guarded).
  - Change the `ALTER DEFAULT PRIVILEGES` at the end of `schema.sql` so new tables and functions grant nothing to `anon` or `authenticated` by default.
  - Revoke EXECUTE from `anon` and `authenticated` on the trigger functions `handle_new_user`, `set_reporter_name`, `sync_reporter_name` and `update_report_zone`.
  - Move `extract_barangay_from_coordinates` to `private`; only the zone trigger uses it.
  - Check with `information_schema.role_table_grants` and `has_function_privilege`.
  - pgTAP: anon has no write privilege on those tables, and TRUNCATE is refused.
  - Then check that every app write path still works: a report insert (anon and signed in), a profile edit, joining an agency, recording maintenance.
- [x] **2.D2 Load the map without downloading every report (1.5 h).**
  - Today the app downloads all reports, with all 27 columns, a page at a time, in up to three places:
    - the map's report provider (`components/context/report-provider.tsx`, via `useAllReports`);
    - the dashboard reports tab;
    - the analytics prefetch (`lib/query/hooks/use-analytics.ts`).

    It then works out the latest report per drain in JavaScript (`fetchLatestReportsPerComponent`). The unused `latest_report_per_component` view already does that in the database.

  - The map should read that view plus `report_counts_by_component`. The per-component history should load on demand (`fetchReportsForComponent`).
  - The dashboard reports tab should filter and page in the database: `.range()` plus `.eq()` for its filters, and an exact count for "N of M".
  - Remove the duplicate prefetch.
  - Keep realtime working: on an insert or update, update just that component's pin.
  - Tests for the new readers. Record the size of one page load before and after in the commit.

- [ ] **2.D3 Decide geocoding; drop the k-means leftovers (45 min).**
  - `geocode_worker_lock`, the trigger `trigger-geocode-on-insert`, `reports.address` and `reports.geocoded_status` serve a hosted edge function that isn't in the repo. They're switched off locally, and `zone` already comes from coordinates.
  - Default: keep the columns (the UI shows `address` when present), but document in `schema.sql` that the worker is hosted-only. Don't drop anything that the hosted edge function might write to. Add a `needs user` note: bring `geocodeWorker` into the repo, or retire geocoding.
  - Drop `flood_results.cluster` and `cluster_score` only if 2.11 or the stored-scenario rescoring has replaced what the UI shows from them. Otherwise leave them, and note it here.
  - Drop the placeholder clog columns (`clogfac`, `clog_per`, `clogtime`) only as part of D4, which drops their tables anyway. Their values are defaults: 1,215 of 1,231 storm drains and all 138 inlets are exactly 50 / 1.
- [ ] **2.D4 One source for the drainage network (2.5 h, L; follow the stop rule strictly).**
  - The network is stored three times: the four GIS tables (`inlets`, `outlets`, `man_pipes`, `storm_drains`, 54 columns), which the app never queries; the map's `public/drainage/*.geojson`; and the backend's `.inp`.
  - Make `components` the database's single copy:
    1. List every GeoJSON property the map and control panel actually read (grep `lib/map`, `components/control-panel`, `hooks`). Add those to `components`: typed columns for the few used everywhere, plus an `attributes jsonb` for the rest. For pipes, store the line geometry as well as the point.
    2. Write `scripts/export-network-geojson.mjs`. It reads `components` from the local database and writes the four GeoJSON files. Its output must be equivalent to today's files: same features, and same properties the app reads. Prove it with a script that diffs the two sets.
    3. Change `supabase/seed/reference_data.sql` so it loads `components` directly (generated by a node script from the current inserts), then drop the four tables and their policies.
    4. The backend's `.inp` stays as it is; the roadmap (G2) covers rebuilding it. Note in `schema.sql` that the `.inp` is the simulation's copy.
  - If the map needs a property that's hard to carry, stop after step 2. Keep the tables, commit the export script, and log why.
- [ ] **2.D5 Stop copying component data into every report (1.5 h, after D2 and 2.3).**
  - `reports.category` repeats `components.type`. `long` and `lat` are the drain's coordinates, copied at insert. `resolved_image` and `resolved_at` copy the maintenance record that `resolved_by_maintenance_id` points to.
  - Add a `reports_with_component` view (`security_invoker`) that joins these in, and point every reader at it.
  - Only then drop the copied columns. That means updating:
    - the insert policy;
    - the zone trigger (read the location from `components`);
    - `check_report_submission`;
    - `record_maintenance`;
    - the dashboard views;
    - the seed, the types and the realtime handling.
  - Keep `reporter_name`: it is deliberate, because profiles aren't public.
  - If the time runs out, stop after the view and the reader switch, and leave the columns. Log it.
- [ ] **2.D6 Reorganise `schema.sql` and document the report lifecycle (1 h).**
  - Regroup `schema.sql` by area (types, people and agencies, reference data, reports, maintenance, grants).
  - Remove the dump noise: runs of blank lines, and the "Enable read access for all users" policy names (give them descriptive names).
  - Proof that nothing changed: `declarative sync --no-apply` must print "No schema changes found". A policy rename is a real change and gets its own small migration.
  - Add `docs/architecture/REPORT_LIFECYCLE.md`: a state diagram (Mermaid) of `status`, `review_status` and the maintenance `verification_status`, and which function moves each.

### Backend (science roadmap phase 1 and engineering)

- [ ] **2.11 Sensitivity analysis (1.5 h, roadmap A1).**
  - Add `scripts/sensitivity.py`: Dirichlet weights around (0.5, 0.3, 0.2), full-scale references log-uniform between ×0.5 and ×2, N = 2000, on the baseline.
  - Output: Kendall τ, top-50 Jaccard, and top-50 survival share. Write a report to `docs/sensitivity-2026-09-27.md`.
  - Tests with small N. Rank bands in the API payload come in a later item; not now.
- [ ] **2.12 No invented exposure (45 min, roadmap B1).**
  - A node outside every barangay takes the nearest barangay within 250 m.
  - Past 250 m, `Exposure_Score` is null and the node is flagged; it's no longer scored 0.5.
  - Update the frontend `NodeSimulationResult` type and table so null reads "unknown".
  - Report how many nodes fall back.
- [ ] **2.13 Model version stamp (30 min, roadmap G1).** Add the `.inp` sha256 to `model_info` and to `simulation_runs` rows (an extra column in the frontend schema, written by `app/runs.py`). Show a short hash in the caveat strip.
- [ ] **2.14 The 89 inconsistent nodes (45 min, roadmap G4).** Find out why the `.rpt` flood table and the `.out` series disagree: the reporting step, or a threshold. Write the finding up in `docs/`. Fix the time-to-overflow reading if it's our parsing.
- [ ] **2.15 Compress results (20 min).** Add `GZipMiddleware` for responses over 1 KB. Measure payload size before and after, and note it in the commit.
- [ ] **2.16 Within-barangay validation (1 h, roadmap C1).** Extend `validate_against_reports.py`:
  - hazard (not risk) compared within each barangay;
  - confirmed reports or photo matches only;
  - distinct reporters;
  - "insufficient data" below a minimum sample.
  - Use the local seed to exercise it.
- [ ] **2.17 Run recorder shutdown (20 min).** Make sure `RunRecorder.close` flushes pending writes, and that a write failure during shutdown is logged. Test it.

## Phase 3: Execute the re-audit to-do list (whatever time remains)

- [ ] Work through `REAUDIT_TODO.md` from the top: high severity first, then high value per effort.
  - One commit per item, or per small group of same-kind items.
  - Tick each item in that file.
  - Skip anything that needs a user decision, hosted access, new data or paid calls; mark it `needs user` with the question.

## Phase 4: Look at the UI (about 45 min, once other work is committed)

- [ ] Start local Supabase and `pnpm dev --port 3055`. With Playwright's installed Chromium (add a minimal `playwright.config.ts` if needed), script sign-ins as the seeded users (password `password123`) and take screenshots of:
  - dashboard stat cards (no fake trends; "N checked");
  - report cards with review chips as `staff@`, including Confirm and Reject;
  - the profile's "My reports" with "Marked fixed. Is it?" as `citizen@`;
  - the chatbot tab signed out ("Sign in to use the assistant");
  - the results-table caveat strip, if the simulation page renders.

  There is no Mapbox token locally, so map-heavy views may not render; record what could and couldn't be checked.

- [ ] Fix any visual bug found, and commit. Save the screenshots in the scratchpad and list them in the run log. Stop the dev server.

## Phase 5: Wrap-up (20 min)

- [ ] Run every gate on both repos and record the final numbers.
- [ ] Update `CLAUDE.md` (gitignored) and the READMEs for anything that changed how to work.
- [ ] Finish the run log:
  - done and skipped, with reasons;
  - `needs user` questions;
  - the deploy notes carried over from `TRUST_OPS_CHECKLIST.md`.
- [ ] Commit the docs. Leave both branches unmerged and unpushed. End with a short summary for the user: frontend in user terms, backend technical, housekeeping in one line.

---

## Run log

(Append: time, item, commit hash, gate numbers, notes, skips and why.)

### 2026-09-29

| Item    | Commit        | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Phase 0 | —             | Docker was down; started it and the stack. Baseline: type-check clean, vitest 215, lint 19 warnings, pgTAP 140, advisors 0 WARN / 0 ERROR; backend ruff clean, pytest 252.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Phase 1 | (this commit) | Six narrow background audits (1b, 1c, 1d, 1e, 1g, 1h), all finished in under 3 min; 1a, 1f, 1i done inline. 1f maps entirely onto 2.3 / 2.D1 / 2.4 / 2.5. CI already runs type-check and unit tests, so 2.1 is only the pgTAP job.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2.D1    | (this commit) | Clients keep only SELECT, plus INSERT on reports and INSERT/UPDATE on profiles; geocode lock and sequences service-role only; trigger functions and the (now private) barangay lookup not executable by clients; default privileges grant nothing to anon/authenticated (and PUBLIC loses default EXECUTE). Declarative sync now diffs default privileges itself. Test 03 changed from silent no-ops to "permission denied". `scripts/check-write-paths.mjs` verified report insert (anon + signed in), profile edit, join/leave agency, record maintenance. pgTAP 157, advisors clean.                                                                                                                                                                                                                                                                            |
| 2.3     | (this commit) | Column grants: anon reads every `reports` column except `user_id`, `photo_lat`, `photo_lon`, `reviewed_by`, and every `maintenance` column except `performed_by`. `latest_report_per_component` now lists the public columns instead of `reports.*`. Shared readers select `PUBLIC_REPORT_COLUMNS`. Verified: Realtime checks `has_column_privilege` per subscriber role (`realtime.apply_rls`); a signed-out subscriber got 23 keys, none private. Migration hand-edited: a table-level revoke on `reports` generated after the column grants would have wiped them. pgTAP 168.                                                                                                                                                                                                                                                                                   |
| 2.D2    | (this commit) | Map pins read `latest_report_per_component`; report lists (map control panel) fetch per component/date with a 50-row cap and "N of M"; the toggle chart reads a new `report_counts_by_day` view; the dashboard reports tab filters, counts and pages ("Show more", 24 at a time) in the database; the heatmap reads 4 columns. Realtime patches one pin (`mergeLatestReport`, refetches when a pin is rejected). Size: ~654 B per report. Before: every report, up to 3 times per visit (map provider, dashboard tab, analytics prefetch). After: one row per component with reports, plus lists on demand. Local seed (4 reports) is too small to show a byte difference: 2,615 B before, 2,606 B for the view. Fixed on the way: history viewer always said "Low" priority; dashboard readers now throw instead of caching an empty list. pgTAP 169, vitest 235. |
| 2.1     | (this commit) | CI already ran type-check and unit tests (the plan's premise was out of date). Added a `database` job: `supabase/setup-cli` pinned to 2.118.0, `supabase start` without studio/imgproxy/edge-runtime/logflare/vector, `supabase test db`, `db advisors --local --fail-on warn`; deploy now needs it. Checked locally: prettier parses the YAML, the `-x` container names match the CLI's list, `--fail-on warn` exits 0 today. Not run on GitHub (never push).                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2.8     | (this commit) | Removed only the `BACKEND-DrAin` submodule (an empty checkout pointing at an old backend repo; nothing referenced it) and the now-empty `.gitmodules`. **Kept, needs user:** `components/_unused/` is imported by the `/gallery` dev page, which exists so you can look at the six components and decide; `control-panel-portable/` is a deliberate look-only export for another project (its README says so). Delete either with `git rm -r` when you've decided.                                                                                                                                                                                                                                                                                                                                                                                                 |
