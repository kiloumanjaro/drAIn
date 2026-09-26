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

- [ ] Check both repos are on branch `reaudit` with clean trees. Run `npx supabase status`; if the stack is down, start Docker and run `npx supabase start`.
- [ ] Run every gate once on both repos, and record the baseline numbers in the run log. Expected: pgTAP 140, vitest 215, 19 lint warnings, pytest 252.

## Phase 1: Re-audit into a to-do list (about 1.5 h)

Goal: `docs/architecture/REAUDIT_TODO.md`, a list of **verified** findings, each tagged like this:

`[area] [severity] [effort S/M/L] file:line — problem — fix`

Do the audit as narrow passes, inline or with small background subagents (see Mechanics). Read `DATABASE_AUDIT.md`, `DB_HARDENING_CHECKLIST.md`, `TRUST_OPS_CHECKLIST.md` and `drAIn-backend/docs/SCIENCE_ROADMAP.md` first, so nothing already fixed or already planned gets re-reported.

- [ ] **1a. Lint and types.** Explain each of the 19 lint warnings: real problem, or not.
- [ ] **1b. Map and simulation pages** (`app/(main)/map/page.tsx`, `app/(main)/simulation/page.tsx`): effect cleanups (map listeners, intervals, realtime), stale closures, very large functions. Propose splits.
- [ ] **1c. Control panel, reports, profile and dashboard components:**
  - bugs;
  - fake or hard-coded data shown to users (like the mock trends removed earlier);
  - wrong field use;
  - clickable `div`s with no keyboard handling.
- [ ] **1d. `lib/` and `hooks/`:** query keys, error handling, anything still reading more than 1,000 rows without paging.
- [ ] **1e. API routes, `proxy.ts`, `next.config.ts`:** security headers, image hosts, input validation, error leakage, `window.open` without `noopener`, rendering model output as HTML.
- [ ] **1f. Database:**
  - anon-readable personal data (`reports.user_id`);
  - SECURITY DEFINER functions still executable by anon;
  - storage bucket abuse (anon uploads to ReportImage with no size or rate limit);
  - text-typed numeric columns (barangay population).
- [ ] **1g. Backend engineering:**
  - thread safety (JobStore, RunRecorder);
  - repeated heavy work per request;
  - response size (duplicated `nodes_dict`, no gzip);
  - link-suffix matching with `endswith`;
  - `init_flow` actually setting `flow_limit`;
  - unpickling the legacy model;
  - logging and CORS.
- [ ] **1h. Claims and docs:** every "AI-powered", "satellite", "real-time", "predict" or accuracy claim in the landing page, docs pages, READMEs, metadata and chatbot prompt, each with accurate replacement wording. Stale docs: `docs/api/SUPABASE.md`, component READMEs.
- [ ] **1i. Hygiene and tooling:**
  - `control-panel-portable/`, `components/_unused/`, `BACKEND-DrAin/`, the 5 MB backend `logo.png`;
  - `.gitignore` gaps;
  - `e2e/` has no Playwright config;
  - frontend CI runs no tests and no pgTAP.
- [ ] Order `REAUDIT_TODO.md` by value divided by effort, and commit it (`docs: re-audit to-do list`).

## Phase 2: Known backlog (about 3–4 h; can run before Phase 1 finishes)

These are already verified. Each is one commit.

### Frontend and database

- [ ] **2.1 Frontend CI (45 min).** In `.github/workflows/deploy.yml`, or a new `ci.yml`, run `type-check` and `test` alongside lint. Add a `database` job that does `supabase start`, `supabase db reset` and `supabase test db` (`supabase/setup-cli` action). Can't be run locally beyond a YAML lint; say so in the commit.
- [ ] **2.2 Lint to zero (45 min).** Fix every warning worth fixing; justify any left with an inline disable comment.
- [ ] **2.3 Hide `reports.user_id` from signed-out visitors (45 min).**
  - Revoke column `SELECT (user_id)` from `anon`, keeping it for `authenticated`.
  - Check that every anon read path (map, dashboard, realtime) doesn't select `*` in a way that now fails: switch those to explicit columns.
  - pgTAP: anon can't read `user_id`; a citizen still reads their own reports.
- [ ] **2.4 Barangay population columns to numbers (30 min).** Change `barangay_boundaries` population and density from text to numeric, hand-editing the migration's data cast. Update readers.
- [ ] **2.5 Report photo uploads (45 min).** Limit anonymous storage inserts to `public/<uuid>.<ext>` image names. Check whether the bucket's 50 MiB limit should be lower (for example 10 MiB) in `config.toml`. pgTAP or a REST check.
- [ ] **2.6 Admin screen for join codes and roles (1.5 h, M).**
  - Admin-only section in the profile panel: rotate the agency's join code (show the new code once, with a copy button) and list agency members.
  - Members are listed by an admin-only SECURITY DEFINER RPC `agency_members()`.
  - Promote or demote members through `set_member_agency`.
  - pgTAP for the new RPC.
- [ ] **2.7 Rewrite `docs/api/SUPABASE.md` (30 min)** from `supabase/schemas/` and `types/database.types.ts`, or replace it with a short page that points at them.
- [ ] **2.8 Remove dead code (30 min).** Delete `control-panel-portable/`, `components/_unused/` and `BACKEND-DrAin/` after grep proves nothing imports them, then run type-check, test and lint.
- [ ] **2.9 Accurate claims (45 min).** Apply the wording from 1h, or from roadmap workstream F if 1h isn't done: the landing page, docs sections, metadata, both READMEs, and the chatbot prompt's "satellite data" and "AI analysis" lines.
- [ ] **2.10 Relabel `init_flow` in the UI (20 min).** The link panel's "Initial flow" control sets SWMM's flow limit. Relabel it "Flow limit (m³/s)", with a tooltip. The wire name stays.

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
