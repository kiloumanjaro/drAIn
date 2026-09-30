# Trust and operations checklist (temporary, working copy)

Follow-on to `DB_HARDENING_CHECKLIST.md`. Fixes the critique items left open
after the hardening branch (2026-09-26):

- citizen reports are unverified (no dedupe, no rate limit, no photo/pin check);
- resolution is self-attested (whoever did the work certifies it);
- the simulation API has no auth, unbounded overrides, in-memory jobs;
- the chatbot route has no auth, no rate limit, unbounded history;
- the UI never says how confident or how current the model is.

Then writes `drAIn-backend/docs/SCIENCE_ROADMAP.md`, a plan for the science
critique (weights, exposure, validation, storms, tides, blockage, naming).

Local only. Never touch the hosted project; never push; don't merge.

Branches: `trust-and-ops` in **drAIn-frontend** (from `db-hardening`) and in
**drAIn-backend** (from `refactor`). One commit per step, conventional
messages, check each with `git log --oneline -1`.

Gate per frontend step: the schema-first workflow in CLAUDE.md (declarative
sync, db reset, gen types, prettier), then `pnpm type-check`, `pnpm test`,
`pnpm lint`, `npx supabase test db`, `npx supabase db advisors --local`.
Gate per backend step: `ruff format --check`, `ruff check`, `pytest`.

## Decisions taken (recommended defaults, no user input)

- **Staff review of reports.** Staff can confirm or reject a report
  (spam, duplicate, not a drainage problem) and adjust its priority. Rejected
  reports stay visible to staff but drop out of every count, map pin number
  and the validation script.
- **Duplicates.** One open report per reporter per component. A second
  person reporting the same component is corroboration, and is allowed.
- **Rate limits.** In the database, per reporter: signed in 5/hour and
  10/day (since 2026-09-30); descriptions ≤ 1,000 chars; signed out 3/hour and 10/day, keyed by a hash of the client IP
  from the request headers. Stored in `private`, never on the report.
- **Photo location.** The photo's EXIF GPS and time are sent with the
  report. A trigger measures the distance to the component and labels it
  `match` (≤ 100 m), `mismatch` or `missing`. Client-supplied, so a signal
  for staff triage, not proof. Said so in comments and UI.
- **Independent resolution.** A resolved maintenance record is
  `unverified` until someone other than the person who did it reviews it:
  another staff member (`review_maintenance`) or a citizen whose report it
  closed (`respond_to_resolution`). A dispute reopens the reports (staff
  dispute: all of them; reporter dispute: theirs) and marks the record
  `disputed`. The dashboard shows how many fixes are verified.
- **Chatbot.** Signed-in only. Input ≤ 2,000 chars, history ≤ 12 turns of
  ≤ 2,000 chars, structured as role/content, with the system prompt as
  Gemini's `systemInstruction`. 20 requests / 10 min and 100 / day per user
  via a database rate limiter. Output capped at 1,024 tokens.
- **Simulation API.** Every `/simulations` call needs a Supabase access
  token, checked against Supabase Auth (cached briefly). Per user: one job
  outstanding, 10 runs per hour. Overrides bounded and finite; unknown node
  and link ids rejected. The deprecated `/run-simulation` is removed.
- **Durable jobs.** When `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are
  set, the backend mirrors every job to `public.simulation_runs` (owner-only
  RLS, no client writes). Polls fall back to it after a restart or after the
  in-memory retention; jobs caught mid-run by a restart are marked failed.
  Runs older than 7 days are pruned. Without the settings it stays
  in-memory and logs a warning.
- **Model caveats in the UI.** One `model_info` block (network date from
  the .inp title, "not calibrated against field records", provisional
  thresholds, weights) sent by the backend and mirrored in a frontend
  constant for the stored scenarios; shown wherever the ranking is read.

## Steps

- [x] 0. Branches; this file.
- [x] 1. Reports: review, dedupe, rate limit, photo check (DB, tests, UI).
- [x] 2. Independent resolution checks (DB, tests, UI).
- [x] 3. Chatbot: auth, limits, structured history (DB rate limiter, route, UI).
- [x] 4. Backend: auth, per-user limits, bounded overrides, drop sync endpoint.
- [x] 5. Backend + DB: durable simulation runs in Supabase.
- [x] 6. Frontend: send the token to the simulation API; sign-in prompt.
- [x] 7. Model caveats: backend `model_info`, frontend notice.
- [x] 8. Backend validation script: paging, `No hazard`, skip rejected.
- [x] 9. `drAIn-backend/docs/SCIENCE_ROADMAP.md`.
- [x] 10. Wrap-up: docs, CLAUDE.md, final gates, report.

## Run log

Frontend (`trust-and-ops` on `db-hardening`):

| Step | Commit  | Notes                                                                                                                                                                                                                                                             |
| ---- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | cc1df0c | `schema_trust.sql`; tests 10. Three older tests filed several reports on one component and now hit the duplicate rule first; moved to other components. The profile's "my reports" list was always empty (matched names to ids); it now loads the user's reports. |
| 2    | ceb00d7 | `maintenance_reviews`, `review_maintenance`, `respond_to_resolution`; tests 11. Also removed made-up trend lines, percentage changes and stock-photo "admins" from the dashboard stat cards.                                                                      |
| 3    | 90ddc6b | `schema_ops.sql` rate limiter; tests 12. Checked on a dev server: 401 signed out, 400 old history format, 429 with the allowance pre-filled (no paid model call made).                                                                                            |
| 5–6  | 7fe6c0f | `simulation_runs`; tests 13. Simulation client sends the token.                                                                                                                                                                                                   |
| 7    | 36371dd | Caveat strip on both results tables; assistant told ratings are simulated.                                                                                                                                                                                        |

Backend (`trust-and-ops` on `refactor`):

| Step | Commit  | Notes                                                                                                                                                                                                                           |
| ---- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4    | d75afb7 | `app/auth.py`; per-user limits in the job store; bounded, strict overrides; unknown ids 422; `/run-simulation` removed.                                                                                                         |
| 5    | 4b26a94 | `app/runs.py`. Checked end to end against local Supabase: 401 with no token, 422 for an unknown node, run recorded (37 KB stored), result read back after a server restart, and a run the restart cut short reported as failed. |
| 7    | 8fc4b68 | `drain/model_info.py`, in every result's metadata.                                                                                                                                                                              |
| 8    | c490f8a | The script could not run before (KeyError on "No hazard"). Checked against the local database. Two mislabelled commits from a failed lint run were squashed into this one before anything else was built on them.               |
| 9    | 14451bb | `docs/SCIENCE_ROADMAP.md`.                                                                                                                                                                                                      |

Final gate: pgTAP 140, vitest 215, type-check clean, lint 19 warnings (all
pre-existing), advisors 0 errors / 0 warnings / 20 info (16 unused indexes
on a fresh database, 4 private tables with RLS and no policies by design).
Backend: ruff clean, pytest 252.

## Follow-ups for the user

- **Deploying the backend changes needs settings on the host first:**
  `SUPABASE_URL` and `SUPABASE_ANON_KEY` (without them it refuses every run
  with 503, by design), and `SUPABASE_SERVICE_ROLE_KEY` for durable runs.
  The `simulation_runs` migration must be applied before the key is set.
- The deployed frontend's custom runs start failing with 401 as soon as the
  new backend is live, until the new frontend (which sends the token) is
  deployed too. Deploy both together.
- Signed-out report limits are per IP address. Many phones share one
  address on mobile networks, so three an hour may be tight there; the
  numbers are in `check_report_submission`. Since 2026-09-29 signed-out
  visitors can't file reports or upload photos at all, so only the
  signed-in limits apply.
- The photo check trusts the phone's EXIF data. It helps staff triage; it
  isn't proof, and the UI words it as "the photo says".
- UI changes were type-checked and unit-tested but not looked at in a
  browser: the stat cards, the review and verification buttons, the
  "Is it fixed?" prompt, the chatbot's signed-out state and the caveat strip.
- The science plan is in `drAIn-backend/docs/SCIENCE_ROADMAP.md`; its
  phase 1 needs no new data.
